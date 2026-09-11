import sharp from "sharp";
import path from "path";

export interface OptimizeImageOptions {
  category?: "profiles" | "covers" | "receipts" | "branding" | "general" | string;
  maxDimension?: number;
  quality?: number;
  targetMaxSizeBytes?: number; // default 2.5MB (safely within 1 - 3 MB)
}

export interface OptimizedImageResult {
  buffer: Buffer;
  format: string; // e.g. "webp", "pdf", "svg"
  ext: string; // e.g. ".webp", ".pdf", ".svg"
  sizeBytes: number;
  isImage: boolean;
}

export const MAX_UPLOAD_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB limit
export const MAX_TARGET_OUTPUT_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5MB (target 1-3MB max)

/**
 * Validates initial file upload size against 8MB limit.
 */
export function validateImageUploadSize(sizeBytes: number, maxBytes: number = MAX_UPLOAD_IMAGE_SIZE_BYTES): void {
  if (sizeBytes > maxBytes) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`FILE_TOO_LARGE: Uploaded file is ${sizeMB}MB, which exceeds the ${maxMB}MB limit. Please upload an image under ${maxMB}MB.`);
  }
}

/**
 * Optimizes an image buffer by converting it to WebP and compressing it to 1 - 3MB (typically 100KB-600KB).
 * Preserves PDFs and SVGs untouched.
 */
export async function optimizeImageToWebP(
  inputBuffer: Buffer,
  originalFileName: string = "image.jpg",
  options?: OptimizeImageOptions
): Promise<OptimizedImageResult> {
  const ext = (path.extname(originalFileName) || "").toLowerCase();

  // 1. If it's a PDF or SVG, pass through without rasterizing
  if (ext === ".pdf") {
    return {
      buffer: inputBuffer,
      format: "pdf",
      ext: ".pdf",
      sizeBytes: inputBuffer.length,
      isImage: false,
    };
  }

  if (ext === ".svg") {
    return {
      buffer: inputBuffer,
      format: "svg",
      ext: ".svg",
      sizeBytes: inputBuffer.length,
      isImage: true,
    };
  }

  const category = options?.category || "general";
  const targetMaxBytes = options?.targetMaxSizeBytes || MAX_TARGET_OUTPUT_SIZE_BYTES;

  // Determine sizing defaults per category
  let maxWidth = 1920;
  let maxHeight = 1080;
  let quality = options?.quality || 80;

  if (category === "profiles") {
    maxWidth = 800;
    maxHeight = 800;
    quality = 82;
  } else if (category === "covers") {
    maxWidth = 1920;
    maxHeight = 1080;
    quality = 80;
  } else if (category === "receipts") {
    maxWidth = 1920;
    maxHeight = 1920;
    quality = 80;
  } else if (category === "branding") {
    maxWidth = 1200;
    maxHeight = 1200;
    quality = 85;
  }

  if (options?.maxDimension) {
    maxWidth = options.maxDimension;
    maxHeight = options.maxDimension;
  }

  try {
    // 2. Process with sharp: rotate to match EXIF, resize if oversized, convert to WebP
    const pipeline = sharp(inputBuffer, { failOnError: false })
      .rotate() // auto-orient based on EXIF from phone cameras
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 4,
      });

    let outputBuffer = await pipeline.toBuffer();

    // 3. If output is still larger than target (e.g. 2.5MB), do a second pass with lower quality
    if (outputBuffer.length > targetMaxBytes) {
      quality = Math.max(50, quality - 25);
      outputBuffer = await sharp(inputBuffer, { failOnError: false })
        .rotate()
        .resize({
          width: Math.round(maxWidth * 0.8),
          height: Math.round(maxHeight * 0.8),
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 5,
        })
        .toBuffer();
    }

    return {
      buffer: outputBuffer,
      format: "webp",
      ext: ".webp",
      sizeBytes: outputBuffer.length,
      isImage: true,
    };
  } catch (err: any) {
    console.warn(`[IMAGE_OPTIMIZER_WARN] Failed optimizing ${originalFileName} to WebP:`, err?.message || err);
    // Graceful fallback to original buffer if sharp cannot parse file
    return {
      buffer: inputBuffer,
      format: ext.replace(".", "") || "bin",
      ext: ext || ".bin",
      sizeBytes: inputBuffer.length,
      isImage: false,
    };
  }
}
