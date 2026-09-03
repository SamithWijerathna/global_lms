import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../../db";
import { promises as fs } from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public", "uploads", "materials");
const tempDir = path.join(process.cwd(), "public", "uploads", "temp");

async function ensureDirs() {
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });
}

/**
 * Clean up old temporary files to prevent disk space issues
 */
async function cleanupOldTempFiles() {
  try {
    const files = await fs.readdir(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > TEMP_FILE_MAX_AGE) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old temp file: ${file}`);
        }
      } catch (err) {
        // File might have been deleted already, ignore
      }
    }
  } catch (err) {
    console.error("Error cleaning up temp files:", err);
  }
}

/**
 * Validate chunk data
 */
function validateChunkData(formData: FormData) {
  const chunk = formData.get("chunk") as File | null;
  const chunkIndex = formData.get("chunkIndex") as string;
  const tempUploadId = formData.get("tempUploadId") as string;
  const fileType = formData.get("fileType") as string;
  const originalName = formData.get("originalName") as string;

  if (!chunk) {
    return { error: "Missing chunk file", status: 400 };
  }

  if (!chunkIndex || isNaN(parseInt(chunkIndex))) {
    return { error: "Invalid chunk index", status: 400 };
  }

  if (!tempUploadId || tempUploadId.length < 10) {
    return { error: "Invalid upload ID", status: 400 };
  }

  if (!fileType || !["video", "pdf", "image"].includes(fileType)) {
    return { error: "Invalid file type", status: 400 };
  }

  if (!originalName) {
    return { error: "Missing original filename", status: 400 };
  }

  return {
    chunk,
    chunkIndex: parseInt(chunkIndex),
    tempUploadId,
    fileType: fileType as "video" | "pdf" | "image",
    originalName,
  };
}

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("class_id");
  const materialId = searchParams.get("material_id");

  try {
    if (materialId) {
      const [materials] = await db.query(
        "SELECT * FROM class_material_list WHERE material_id = ?",
        [materialId]
      );
      return NextResponse.json(materials);
    }

    if (classId) {
      const [materials] = await db.query(
        "SELECT * FROM class_material_list WHERE class_id = ? ORDER BY material_id DESC",
        [classId]
      );
      return NextResponse.json(materials);
    }

    const [classes] = await db.query(`
      SELECT 
        c.class_id, c.class_title, c.class_description, c.class_type, c.class_price, c.class_imageurl,
        COUNT(m.material_id) AS material_count
      FROM class_list c
      LEFT JOIN class_material_list m ON c.class_id = m.class_id
      GROUP BY c.class_id, c.class_title, c.class_description, c.class_type, c.class_price, c.class_imageurl
      ORDER BY c.class_id
    `);
    return NextResponse.json(classes);
  } catch (err: any) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  await ensureDirs();

  // Run cleanup periodically (only on some requests to avoid overhead)
  if (Math.random() < 0.1) {
    cleanupOldTempFiles().catch(console.error);
  }

  const formData = await req.formData();

  /* ==================== CHUNK UPLOAD ==================== */
  const chunk = formData.get("chunk") as File | null;
  if (chunk) {
    const validation = validateChunkData(formData);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { chunkIndex, tempUploadId, fileType, originalName } = validation;

    try {
      // Determine file extension
      const ext = path.extname(originalName) || 
                  (fileType === "video" ? ".mp4" : fileType === "pdf" ? ".pdf" : ".jpg");
      const tempFilename = `${tempUploadId}_${fileType}${ext}`;
      const tempPath = path.join(tempDir, tempFilename);

      // Convert chunk to buffer
      const buffer = Buffer.from(await chunk.arrayBuffer());

      // Validate chunk size (prevent abuse)
      const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB max per chunk
      if (buffer.length > MAX_CHUNK_SIZE) {
        return NextResponse.json({ error: "Chunk too large" }, { status: 413 });
      }

      // Write chunk (append mode for subsequent chunks)
      const flag = chunkIndex === 0 ? "w" : "a";
      const handle = await fs.open(tempPath, flag);
      await handle.write(buffer, 0, buffer.length);
      await handle.close();

      console.log(`Chunk ${chunkIndex} received for ${tempUploadId} (${buffer.length} bytes)`);

      return NextResponse.json({ 
        success: true, 
        chunkIndex, 
        bytesWritten: buffer.length 
      });
    } catch (err: any) {
      console.error(`Chunk upload error (${chunkIndex}):`, err);
      return NextResponse.json({ 
        error: `Failed to write chunk ${chunkIndex}: ${err.message}`,
        success: false 
      }, { status: 500 });
    }
  }

  /* ==================== FINALIZE FILE ==================== */
  if (formData.get("finalize_file")) {
    const tempUploadId = formData.get("tempUploadId") as string;
    const fileType = formData.get("fileType") as "video" | "pdf" | "image";

    if (!tempUploadId || !fileType) {
      return NextResponse.json({ error: "Missing finalize parameters" }, { status: 400 });
    }

    try {
      // Find temp file
      const files = await fs.readdir(tempDir);
      const tempFile = files.find(f => f.startsWith(tempUploadId) && f.includes(fileType));

      if (!tempFile) {
        return NextResponse.json({ 
          error: "Temp file not found. Upload may have failed.",
          success: false 
        }, { status: 404 });
      }

      const tempPath = path.join(tempDir, tempFile);

      // Verify file exists and has size
      const stats = await fs.stat(tempPath);
      if (stats.size === 0) {
        await fs.unlink(tempPath);
        return NextResponse.json({ 
          error: "Uploaded file is empty",
          success: false 
        }, { status: 400 });
      }

      // Generate final filename
      const materialId = `MT${Date.now().toString(36).toUpperCase()}`;
      const ext = path.extname(tempFile);
      const finalName = fileType === "video" ? `${materialId}_video${ext}` :
                        fileType === "pdf" ? `${materialId}_pdf${ext}` :
                        `${materialId}${ext}`;
      const finalPath = path.join(uploadDir, finalName);

      // Move file to final location
      await fs.rename(tempPath, finalPath);

      const fileUrl = `/uploads/materials/${finalName}`;
      console.log(`File finalized: ${fileUrl} (${stats.size} bytes)`);

      return NextResponse.json({ 
        success: true, 
        materialId, 
        fileUrl,
        fileSize: stats.size 
      });
    } catch (err: any) {
      console.error("Finalize error:", err);
      return NextResponse.json({ 
        error: `Failed to finalize file: ${err.message}`,
        success: false 
      }, { status: 500 });
    }
  }

  /* ==================== DB INSERT (Add new material) ==================== */
  if (formData.get("db_insert")) {
    const material_title = formData.get("material_title") as string;
    const material_description = formData.get("material_description") as string || null;
    const material_type = formData.get("material_type") as string;
    const material_link = formData.get("material_link") as string || null;
    const class_ids = JSON.parse(formData.get("class_ids") as string);
    const material_id = formData.get("material_id") as string;
    const material_imageurl = formData.get("material_imageurl") as string || null;
    const material_video_url = formData.get("material_video_url") as string || null;
    const material_pdf_url = formData.get("material_pdf_url") as string || null;
    const downloadable = (formData.get("downloadable") as string) === "true";

    // Validate required fields
    if (!material_title || !material_title.trim()) {
      return NextResponse.json({ error: "Material title is required" }, { status: 400 });
    }

    if (!Array.isArray(class_ids) || class_ids.length === 0) {
      return NextResponse.json({ error: "At least one class must be selected" }, { status: 400 });
    }

    if (!material_id) {
      return NextResponse.json({ error: "Material ID is required" }, { status: 400 });
    }

    // Handle video-specific fields
    let expire_hours: string | null = null;
    let view_count_enabled = 0;
    let view_limit: number | null = null;

    if (material_type === "video") {
      const expire = formData.get("expire_hours") as string;
      if (expire === "unlimited") {
        expire_hours = "unlimited";
      } else if (expire) {
        const hours = parseInt(expire);
        if (!isNaN(hours) && hours > 0) {
          expire_hours = expire;
        }
      }

      if (formData.get("view_count_enabled") === "true") {
        view_count_enabled = 1;
        const limit = formData.get("view_limit") as string;
        if (limit) {
          const limitNum = parseInt(limit);
          if (!isNaN(limitNum) && limitNum > 0) {
            view_limit = limitNum;
          }
        }
      }
    }

    try {
      // Insert material for each class
      for (const class_id of class_ids) {
        await db.query(
          `INSERT INTO class_material_list 
           (material_id, material_title, material_description, material_type, material_link,
            class_id, material_imageurl, material_video_url, material_pdf_url, downloadable,
            expire_hours, view_count_enabled, view_limit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            material_id, 
            material_title.trim(), 
            material_description?.trim() || null, 
            material_type, 
            material_link?.trim() || null,
            class_id, 
            material_imageurl, 
            material_video_url, 
            material_pdf_url, 
            downloadable ? 1 : 0,
            expire_hours, 
            view_count_enabled, 
            view_limit
          ]
        );
      }

      console.log(`Material ${material_id} inserted successfully for ${class_ids.length} classes`);

      return NextResponse.json({ 
        success: true, 
        material_id,
        classes_count: class_ids.length 
      });
    } catch (err: any) {
      console.error("DB insert error:", err);
      return NextResponse.json({ 
        error: `Failed to save material: ${err.message}`,
        success: false 
      }, { status: 500 });
    }
  }

  /* ==================== DB UPDATE (Edit existing material) ==================== */
  if (formData.get("update_material") || formData.get("db_update")) {
    const material_id = formData.get("material_id") as string;
    const material_title = formData.get("material_title") as string;
    const material_description = formData.get("material_description") as string || null;
    const material_type = formData.get("material_type") as string;
    const material_link = formData.get("material_link") as string || null;
    const class_ids = JSON.parse(formData.get("class_ids") as string);
    const material_imageurl = formData.get("material_imageurl") as string || null;
    const material_video_url = formData.get("material_video_url") as string || null;
    const material_pdf_url = formData.get("material_pdf_url") as string || null;
    const downloadable = (formData.get("downloadable") as string) === "true";

    let expire_hours: string | null = null;
    let view_count_enabled = 0;
    let view_limit: number | null = null;

    if (material_type === "video") {
      const expire = formData.get("expire_hours") as string;
      if (expire === "unlimited") {
        expire_hours = "unlimited";
      } else if (expire) {
        expire_hours = expire;
      } else {
        expire_hours = null;
      }

      if (formData.get("view_count_enabled") === "true") {
        view_count_enabled = 1;
        const limit = formData.get("view_limit") as string;
        if (limit) view_limit = parseInt(limit);
      } else {
        view_count_enabled = 0;
        view_limit = null;
      }
    }

    if (!material_id || !material_title || class_ids.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
      // Delete old entries
      await db.query("DELETE FROM class_material_list WHERE material_id = ?", [material_id]);

      // Insert updated entries
      for (const class_id of class_ids) {
        await db.query(
          `INSERT INTO class_material_list 
           (material_id, material_title, material_description, material_type, material_link,
            class_id, material_imageurl, material_video_url, material_pdf_url, downloadable,
            expire_hours, view_count_enabled, view_limit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            material_id, material_title, material_description, material_type, material_link,
            class_id, material_imageurl, material_video_url, material_pdf_url, downloadable ? 1 : 0,
            expire_hours, view_count_enabled, view_limit
          ]
        );
      }

      return NextResponse.json({ success: true, material_id });
    } catch (err: any) {
      console.error("Update error:", err);
      return NextResponse.json({ 
        error: `Failed to update material: ${err.message}`,
        success: false 
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("material_id");

  if (!materialId) {
    return NextResponse.json({ error: "material_id required" }, { status: 400 });
  }

  try {
    // Get file URLs
    const [rows] = await db.query(
      "SELECT material_imageurl, material_video_url, material_pdf_url FROM class_material_list WHERE material_id = ? LIMIT 1",
      [materialId]
    );
    const files = (rows as any)[0] || {};

    // Delete from DB
    const [result] = await db.query("DELETE FROM class_material_list WHERE material_id = ?", [materialId]);
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Delete physical files
    const toDelete = [
      files.material_imageurl,
      files.material_video_url,
      files.material_pdf_url,
    ].filter(Boolean);

    for (const file of toDelete) {
      try {
        await fs.unlink(path.join(process.cwd(), "public", file));
        console.log(`Deleted file: ${file}`);
      } catch (err) {
        console.warn(`Failed to delete file: ${file}`, err);
      }
    }

    return NextResponse.json({ success: true, deleted: materialId });
  } catch (err: any) {
    console.error("DELETE error:", err);
    return NextResponse.json({ 
      error: `Delete failed: ${err.message}`,
      success: false 
    }, { status: 500 });
  }
}