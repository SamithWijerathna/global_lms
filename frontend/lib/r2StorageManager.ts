import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface R2UploadResult {
  url: string;
  fileKey: string;
  sizeBytes: number;
  provider: "r2" | "local_fallback";
}

export interface MediaStorageUsageResult {
  usedBytes: number;
  usedGB: number;
  totalGB: number;
  percentage: number;
  remainingGB: number;
}

// In-memory cache for R2 tenant byte counts to prevent spamming ListObjectsV2
const r2UsageCache = new Map<string, { bytes: number; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

let cachedS3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!cachedS3Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    cachedS3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return cachedS3Client;
}

/**
 * Calculates current Cloudflare R2 usage for a specific tenant.
 */
export async function getTenantR2StorageUsage(
  tenantId: string,
  maxMediaStorageGb: number = 10
): Promise<MediaStorageUsageResult> {
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const cacheKey = `r2_usage_${cleanId}`;
  const now = Date.now();

  let usedBytes = 0;
  const cached = r2UsageCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    usedBytes = cached.bytes;
  } else if (isR2Configured()) {
    try {
      const s3 = getS3Client();
      const prefix = `tenants/${cleanId}/materials/`;
      let continuationToken: string | undefined = undefined;
      let total = 0;

      do {
        const cmd = new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET_NAME,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });
        const res = await s3.send(cmd);
        if (res.Contents) {
          for (const item of res.Contents) {
            total += item.Size || 0;
          }
        }
        continuationToken = res.NextContinuationToken;
      } while (continuationToken);

      usedBytes = total;
      r2UsageCache.set(cacheKey, { bytes: usedBytes, expiresAt: now + CACHE_TTL_MS });
    } catch (err: any) {
      console.warn(`[R2 USAGE SCAN WARN] Error scanning R2 for ${cleanId}:`, err.message);
    }
  } else {
    // If R2 not configured, check local materials folder
    const localDir = path.join(process.cwd(), "public", "uploads", "tenants", cleanId, "materials");
    if (fs.existsSync(localDir)) {
      try {
        const files = fs.readdirSync(localDir);
        for (const file of files) {
          try {
            const stat = fs.statSync(path.join(localDir, file));
            usedBytes += stat.size;
          } catch (_) {}
        }
      } catch (_) {}
    }
  }

  const usedGB = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2));
  const totalGB = Math.max(0, maxMediaStorageGb);
  const percentage = totalGB > 0 ? Math.min(100, Math.round((usedGB / totalGB) * 100)) : 0;
  const remainingGB = Math.max(0, parseFloat((totalGB - usedGB).toFixed(2)));

  return {
    usedBytes,
    usedGB,
    totalGB,
    percentage,
    remainingGB,
  };
}

/**
 * Checks if adding new media will exceed the tenant's Cloudflare R2 media quota.
 */
export async function checkTenantR2Quota(
  tenantId: string,
  newFileSizeBytes: number,
  maxMediaStorageGb: number = 0
): Promise<void> {
  if (maxMediaStorageGb <= 0) {
    throw new Error(
      "CLOUD_MEDIA_STORAGE_DISABLED: Direct file and video uploads are not enabled on your plan (0 GB). You can embed YouTube and Vimeo video links for free, or contact your administrator to add media storage."
    );
  }

  const usage = await getTenantR2StorageUsage(tenantId, maxMediaStorageGb);
  const newUsedBytes = usage.usedBytes + newFileSizeBytes;
  const maxBytes = maxMediaStorageGb * 1024 * 1024 * 1024;

  if (newUsedBytes > maxBytes) {
    const newUsedGB = (newUsedBytes / (1024 * 1024 * 1024)).toFixed(2);
    throw new Error(
      `CLOUD_MEDIA_STORAGE_LIMIT_EXCEEDED: Cloud media storage quota reached (${usage.usedGB} GB of ${maxMediaStorageGb} GB used). Uploading this file (${(newFileSizeBytes / (1024 * 1024)).toFixed(2)} MB) would exceed your limit (${newUsedGB} GB / ${maxMediaStorageGb} GB). Please contact your administrator to upgrade your storage plan.`
    );
  }
}

/**
 * Uploads a heavy course material, video, or PDF to Cloudflare R2
 * under `tenants/{tenantId}/materials/{uuid}-{sanitizedName}`.
 * Falls back to local directory if R2 is not configured in .env.
 */
export async function uploadTenantMediaToR2(params: {
  tenantId: string;
  fileBuffer: Buffer;
  originalFileName: string;
  contentType?: string;
  maxMediaStorageGb?: number;
}): Promise<R2UploadResult> {
  const { tenantId, fileBuffer, originalFileName, contentType, maxMediaStorageGb = 10 } = params;

  // 1. Enforce quota
  await checkTenantR2Quota(tenantId, fileBuffer.length, maxMediaStorageGb);

  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = path.extname(originalFileName) || ".bin";
  const fileUuid = crypto.randomUUID();
  const safeName = path.basename(originalFileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const fileKey = `tenants/${cleanId}/materials/${fileUuid}_${safeName}${ext.toLowerCase()}`;

  // 2. If R2 configured, upload to S3 endpoint
  if (isR2Configured()) {
    const s3 = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME!;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType || "application/octet-stream",
      })
    );

    // Invalidate cache
    r2UsageCache.delete(`r2_usage_${cleanId}`);

    const publicDomain = (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");
    const url = publicDomain
      ? `${publicDomain}/${fileKey}`
      : `/api/media/stream?key=${encodeURIComponent(fileKey)}`;

    return {
      url,
      fileKey,
      sizeBytes: fileBuffer.length,
      provider: "r2",
    };
  }

  // 3. Fallback to local materials folder if R2 not configured
  const localDir = path.join(process.cwd(), "public", "uploads", "tenants", cleanId, "materials");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const fileName = `${fileUuid}_${safeName}${ext.toLowerCase()}`;
  const localFilePath = path.join(localDir, fileName);
  await fs.promises.writeFile(localFilePath, fileBuffer);

  return {
    url: `/uploads/tenants/${cleanId}/materials/${fileName}`,
    fileKey: `tenants/${cleanId}/materials/${fileName}`,
    sizeBytes: fileBuffer.length,
    provider: "local_fallback",
  };
}

/**
 * Deletes an object from Cloudflare R2 or local fallback
 */
export async function deleteTenantMediaFromR2(fileKey: string): Promise<void> {
  if (isR2Configured()) {
    try {
      const s3 = getS3Client();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: fileKey,
        })
      );
    } catch (err: any) {
      console.warn(`[R2 DELETE WARN] Failed deleting ${fileKey}:`, err.message);
    }
  } else {
    const localPath = path.join(process.cwd(), "public", "uploads", fileKey);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (_) {}
    }
  }
}

/**
 * Resolves any media URL into a playable browser URL.
 * Automatically transforms raw private S3/R2 endpoints (e.g. *.r2.cloudflarestorage.com)
 * into either the R2 public domain or the secure streaming proxy.
 */
export function resolveMediaUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";

  const publicDomain = (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

  // Handle raw private S3/R2 endpoints:
  // e.g. https://8e3d0021ca6f1e278474ccb7f9d1ff10.r2.cloudflarestorage.com/tenants/...
  // or https://bucket.8e3d0021ca6f1e278474ccb7f9d1ff10.r2.cloudflarestorage.com/tenants/...
  const r2EndpointMatch = rawUrl.match(/^https?:\/\/[^/]*\.r2\.cloudflarestorage\.com\/(.+)$/);
  if (r2EndpointMatch) {
    let key = r2EndpointMatch[1];
    const bucket = process.env.R2_BUCKET_NAME;
    if (bucket && key.startsWith(`${bucket}/`)) {
      key = key.substring(bucket.length + 1);
    }
    if (publicDomain) {
      return `${publicDomain}/${key}`;
    }
    return `/api/media/stream?key=${encodeURIComponent(key)}`;
  }

  // If it's a relative R2 fileKey (e.g. tenants/...)
  if (rawUrl.startsWith("tenants/")) {
    if (publicDomain) {
      return `${publicDomain}/${rawUrl}`;
    }
    return `/api/media/stream?key=${encodeURIComponent(rawUrl)}`;
  }

  return rawUrl;
}

