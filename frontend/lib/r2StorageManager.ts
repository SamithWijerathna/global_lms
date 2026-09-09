import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
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
  filePath?: string;
  fileBuffer?: Buffer;
  fileSizeBytes?: number;
  originalFileName: string;
  contentType?: string;
  maxMediaStorageGb?: number;
}): Promise<R2UploadResult> {
  const { tenantId, filePath, fileBuffer, fileSizeBytes, originalFileName, contentType, maxMediaStorageGb = 10 } = params;

  let sizeBytes = fileSizeBytes;
  if (sizeBytes === undefined) {
    if (fileBuffer) {
      sizeBytes = fileBuffer.length;
    } else if (filePath && fs.existsSync(filePath)) {
      sizeBytes = fs.statSync(filePath).size;
    } else {
      sizeBytes = 0;
    }
  }

  // 1. Enforce quota
  await checkTenantR2Quota(tenantId, sizeBytes, maxMediaStorageGb);

  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = path.extname(originalFileName) || ".bin";
  const fileUuid = crypto.randomUUID();
  const safeName = path.basename(originalFileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const fileKey = `tenants/${cleanId}/materials/${fileUuid}_${safeName}${ext.toLowerCase()}`;

  // 2. If R2 configured, upload to S3 endpoint
  if (isR2Configured()) {
    const s3 = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME!;

    if (filePath && fs.existsSync(filePath)) {
      // Memory-efficient streaming multipart upload (avoids Node.js OOM on large videos)
      const parallelUploads = new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: fileKey,
          Body: fs.createReadStream(filePath),
          ContentType: contentType || "application/octet-stream",
        },
        partSize: 5 * 1024 * 1024, // 5MB parts
        queueSize: 2, // Concurrency 2 for minimal RAM usage (~10MB)
        leavePartsOnError: false,
      });

      await parallelUploads.done();
    } else if (fileBuffer) {
      if (fileBuffer.length > 5 * 1024 * 1024) {
        const { Readable } = await import("stream");
        const parallelUploads = new Upload({
          client: s3,
          params: {
            Bucket: bucket,
            Key: fileKey,
            Body: Readable.from(fileBuffer),
            ContentType: contentType || "application/octet-stream",
          },
          partSize: 5 * 1024 * 1024,
          queueSize: 2,
          leavePartsOnError: false,
        });
        await parallelUploads.done();
      } else {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: contentType || "application/octet-stream",
          })
        );
      }
    } else {
      throw new Error("Neither filePath nor fileBuffer was provided for upload.");
    }

    // Invalidate cache
    r2UsageCache.delete(`r2_usage_${cleanId}`);

    let publicDomain = (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");
    const accountId = process.env.R2_ACCOUNT_ID || "";
    if (
      publicDomain.includes("r2.cloudflarestorage.com") ||
      (accountId && publicDomain.includes(accountId)) ||
      !publicDomain.startsWith("http") ||
      !publicDomain.includes(".")
    ) {
      publicDomain = "";
    }

    const url = publicDomain
      ? `${publicDomain}/${fileKey}`
      : `/api/media/stream?key=${encodeURIComponent(fileKey)}`;

    return {
      url,
      fileKey,
      sizeBytes,
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

  if (filePath && fs.existsSync(filePath)) {
    await fs.promises.copyFile(filePath, localFilePath);
  } else if (fileBuffer) {
    await fs.promises.writeFile(localFilePath, fileBuffer);
  }

  return {
    url: `/uploads/tenants/${cleanId}/materials/${fileName}`,
    fileKey: `tenants/${cleanId}/materials/${fileName}`,
    sizeBytes,
    provider: "local_fallback",
  };
}

/**
 * Deletes an object from Cloudflare R2 or local fallback
 */
export async function deleteTenantMediaFromR2(fileKeyOrUrl: string): Promise<void> {
  if (!fileKeyOrUrl) return;

  let fileKey = fileKeyOrUrl;
  const tenantsIdx = fileKeyOrUrl.indexOf("tenants/");
  if (tenantsIdx !== -1) {
    fileKey = fileKeyOrUrl.substring(tenantsIdx);
  }
  fileKey = decodeURIComponent(fileKey.split("?")[0].replace(/^\/uploads\//, ""));

  if (isR2Configured()) {
    try {
      const s3 = getS3Client();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: fileKey,
        })
      );
      // Invalidate cache for tenant
      const parts = fileKey.split("/");
      if (parts[1]) r2UsageCache.delete(`r2_usage_${parts[1]}`);
    } catch (err: any) {
      console.warn(`[R2 DELETE WARN] Failed deleting ${fileKey}:`, err.message);
    }
  }

  const localPath = path.join(process.cwd(), "public", "uploads", fileKey);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch (_) {}
  }
}

/**
 * Resolves any media URL into a playable browser URL.
 * Automatically transforms raw private S3/R2 endpoints (e.g. *.r2.cloudflarestorage.com)
 * into either the R2 public domain or the secure streaming proxy.
 */
export function resolveMediaUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";

  let publicDomain = (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

  // An R2 public domain MUST be a valid public web host (e.g. https://pub-xxxxxx.r2.dev or https://media.yourdomain.com).
  // If the user configured their S3 account endpoint or account ID by mistake, treat it as empty.
  const accountId = process.env.R2_ACCOUNT_ID || "";
  if (
    publicDomain.includes("r2.cloudflarestorage.com") ||
    (accountId && publicDomain.includes(accountId)) ||
    !publicDomain.startsWith("http") ||
    !publicDomain.includes(".")
  ) {
    publicDomain = "";
  }

  // Find where tenants/... starts in rawUrl
  const tenantsIdx = rawUrl.indexOf("tenants/");
  if (tenantsIdx !== -1) {
    const fileKey = rawUrl.substring(tenantsIdx);
    if (publicDomain) {
      return `${publicDomain}/${fileKey}`;
    }
    return `/api/media/stream?key=${encodeURIComponent(fileKey)}`;
  }

  return rawUrl;
}

