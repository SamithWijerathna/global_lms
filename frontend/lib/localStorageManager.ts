import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StorageUsageResult {
  usedBytes: number;
  usedMB: number;
  totalMB: number;
  percentage: number;
  remainingMB: number;
}

export interface SaveFileResult {
  relativeUrl: string;
  absolutePath: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Calculates the total size of files within a directory recursively.
 */
export function getDirectorySizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;

  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          total += stat.size;
        } catch (_) {}
      }
    }
  } catch (err: any) {
    console.warn(`[STORAGE SCAN WARN] Failed scanning ${dirPath}:`, err.message);
  }
  return total;
}

/**
 * Gets tenant local disk usage in public/uploads/tenants/{tenantId}
 */
export function getTenantLocalStorageUsage(tenantId: string, maxStorageMb: number = 500): StorageUsageResult {
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const tenantDir = path.join(process.cwd(), "public", "uploads", "tenants", cleanId);

  const usedBytes = getDirectorySizeBytes(tenantDir);
  const usedMB = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
  const totalMB = maxStorageMb > 0 ? maxStorageMb : 500;
  const percentage = Math.min(100, Math.round((usedMB / totalMB) * 100));
  const remainingMB = Math.max(0, parseFloat((totalMB - usedMB).toFixed(2)));

  return {
    usedBytes,
    usedMB,
    totalMB,
    percentage,
    remainingMB,
  };
}

/**
 * Checks if adding the new file exceeds the tenant's local storage limit.
 */
export function checkTenantLocalQuota(tenantId: string, newFileSizeBytes: number, maxStorageMb: number = 500): void {
  const usage = getTenantLocalStorageUsage(tenantId, maxStorageMb);
  const newUsedBytes = usage.usedBytes + newFileSizeBytes;
  const maxBytes = maxStorageMb * 1024 * 1024;

  if (newUsedBytes > maxBytes) {
    const newUsedMB = (newUsedBytes / (1024 * 1024)).toFixed(2);
    throw new Error(
      `LOCAL_STORAGE_LIMIT_EXCEEDED: Local storage limit reached (${usage.usedMB} MB used of ${maxStorageMb} MB). Uploading this file (${(newFileSizeBytes / (1024 * 1024)).toFixed(2)} MB) would exceed your limit (${newUsedMB} MB / ${maxStorageMb} MB). Please contact your administrator to upgrade your storage plan.`
    );
  }
}

/**
 * Saves a file to local tenant storage under public/uploads/tenants/{tenantId}/{category}/
 */
export async function saveTenantLocalFile(params: {
  tenantId: string;
  category: "receipts" | "profiles" | "covers" | "general";
  fileBuffer: Buffer;
  originalFileName: string;
  maxStorageMb?: number;
}): Promise<SaveFileResult> {
  const { tenantId, category, fileBuffer, originalFileName, maxStorageMb = 500 } = params;

  // 1. Check Quota
  checkTenantLocalQuota(tenantId, fileBuffer.length, maxStorageMb);

  // 2. Prepare paths
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const uploadDir = path.join(process.cwd(), "public", "uploads", "tenants", cleanId, category);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 3. Generate secure unique filename
  const ext = path.extname(originalFileName) || ".bin";
  const fileUuid = crypto.randomUUID();
  const fileName = `${fileUuid}${ext.toLowerCase()}`;
  const absolutePath = path.join(uploadDir, fileName);

  // 4. Write file synchronously / promise
  await fs.promises.writeFile(absolutePath, fileBuffer);

  const relativeUrl = `/uploads/tenants/${cleanId}/${category}/${fileName}`;

  return {
    relativeUrl,
    absolutePath,
    fileName,
    sizeBytes: fileBuffer.length,
  };
}
