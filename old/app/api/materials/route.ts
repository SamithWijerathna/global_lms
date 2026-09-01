import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../db"; 
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const CHUNK_DIR = path.join(process.cwd(), "tmp/chunks");
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/materials");

// Ensure directories exist
if (!fs.existsSync(CHUNK_DIR)) fs.mkdirSync(CHUNK_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const formData = await req.formData();
  const action = formData.get("action") as string;

  try {

    // ==================== CHUNK UPLOAD ====================
    if (formData.has("chunk")) {
      const chunk = formData.get("chunk") as File;
      const chunkIndex = formData.get("chunkIndex") as string;
      const tempUploadId = formData.get("tempUploadId") as string;
      const fileType = formData.get("fileType") as "video" | "pdf" | "image";

      const chunkPath = path.join(CHUNK_DIR, `${tempUploadId}_${chunkIndex}`);
      const buffer = Buffer.from(await chunk.arrayBuffer());
      fs.writeFileSync(chunkPath, buffer);

      return NextResponse.json({ success: true });
    }

    // ==================== FINALIZE FILE ====================
    if (formData.get("finalize_file") === "true") {
      const tempUploadId = formData.get("tempUploadId") as string;
      const fileType = formData.get("fileType") as "video" | "pdf" | "image";

      const chunkFiles = fs.readdirSync(CHUNK_DIR)
        .filter(f => f.startsWith(tempUploadId))
        .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]));

      const finalFilename = `${uuidv4()}_${fileType}${fileType === "pdf" ? ".pdf" : fileType === "video" ? ".mp4" : ".jpg"}`;
      const finalPath = path.join(UPLOAD_DIR, finalFilename);

      const writeStream = fs.createWriteStream(finalPath);
      for (const chunkFile of chunkFiles) {
        const chunkPath = path.join(CHUNK_DIR, chunkFile);
        const chunkBuffer = fs.readFileSync(chunkPath);
        writeStream.write(chunkBuffer);
        fs.unlinkSync(chunkPath); // Clean chunk
      }
      writeStream.end();

      const fileUrl = `/uploads/materials/${finalFilename}`;
      return NextResponse.json({ success: true, fileUrl });
    }

    // ==================== GET MATERIAL (for edit) ====================
    if (action === "get_material") {
      const material_id = formData.get("material_id") as string;
      if (!material_id) {
        return NextResponse.json({ error: "Missing material_id" }, { status: 400 });
      }

      const [coreRows]: any = await db.query(
        "SELECT * FROM materials WHERE material_id = ? LIMIT 1",
        [material_id]
      );
      if (coreRows.length === 0) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }
      const core = coreRows[0];

      const [assignRows]: any = await db.query(
        "SELECT class_id FROM materials WHERE material_id = ?",
        [material_id]
      );
      const class_ids = assignRows.map((row: any) => row.class_id);

      return NextResponse.json({ core, class_ids });
    }
    // ==================== GET MATERIALS BY CLASS (STUDENT VIEW) ====================
if (action === "class_materials") {
  const class_id = formData.get("class_id") as string;

  if (!class_id) {
    return NextResponse.json({ error: "Missing class_id" }, { status: 400 });
  }

  const [rows]: any = await db.query(
    `SELECT 
        material_id,
        material_title,
        material_description,
        material_type,
        material_imageurl,
        material_video_url,
        material_pdf_url,
        material_link,
        downloadable AS pdf_downloadable,
        view_count_enabled AS view_limit_enabled,
        view_limit,
        expire_hours,
        create_at
     FROM class_material_list
     WHERE class_id = ?
     ORDER BY create_at DESC`,
    [class_id]
  );

  return NextResponse.json(rows);
}


    // ==================== ADD NEW MATERIAL ====================
    if (formData.get("db_insert") === "true") {
      const material_id = formData.get("material_id") as string;
      const material_title = formData.get("material_title") as string;
      const material_description = formData.get("material_description") as string || "";
      const material_type = formData.get("material_type") as string;
      const material_link = formData.get("material_link") as string || null;
      const class_ids_raw = formData.get("class_ids") as string;
      const class_ids = JSON.parse(class_ids_raw);
      const material_video_url = formData.get("material_video_url") as string || null;
      const material_pdf_url = formData.get("material_pdf_url") as string || null;
      const material_imageurl = formData.get("material_imageurl") as string || null;
      const downloadable = formData.get("downloadable") === "true" ? 1 : 0;
      const view_count_enabled = formData.get("view_count_enabled") === "true" ? 1 : 0;
      const view_limit = formData.get("view_limit") ? parseInt(formData.get("view_limit") as string) : null;
      const expire_hours = formData.get("expire_hours") === "unlimited" ? "unlimited" : formData.get("expire_hours") ? parseInt(formData.get("expire_hours") as string) : null;

      if (!material_id || !material_title || class_ids.length === 0) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      for (const class_id of class_ids) {
        await db.query(
          `INSERT INTO materials (
            material_id, material_title, material_description, material_type, material_link,
            material_video_url, material_pdf_url, material_imageurl, class_id,
            downloadable, view_count_enabled, view_limit, expire_hours, create_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            material_id,
            material_title,
            material_description,
            material_type,
            material_link,
            material_video_url,
            material_pdf_url,
            material_imageurl,
            class_id,
            downloadable,
            view_count_enabled,
            view_limit,
            expire_hours,
          ]
        );
      }

      return NextResponse.json({ success: true, message: "Material added successfully" });
    }

    // ==================== UPDATE MATERIAL ====================
    if (action === "update_material") {
      const material_id = formData.get("material_id") as string;
      const material_title = formData.get("material_title") as string;
      const material_description = formData.get("material_description") as string || "";
      const material_type = formData.get("material_type") as string;
      const material_link = formData.get("material_link") as string || null;
      const class_ids_raw = formData.get("class_ids") as string;
      const class_ids = JSON.parse(class_ids_raw);
      const material_video_url = formData.get("material_video_url") as string || null;
      const material_pdf_url = formData.get("material_pdf_url") as string || null;
      const material_imageurl = formData.get("material_imageurl") as string || null;
      const downloadable = formData.get("downloadable") === "true" ? 1 : 0;
      const view_count_enabled = formData.get("view_count_enabled") === "true" ? 1 : 0;
      const view_limit = formData.get("view_limit") ? parseInt(formData.get("view_limit") as string) : null;
      const expire_hours = formData.get("expire_hours") === "unlimited" ? "unlimited" : formData.get("expire_hours") ? parseInt(formData.get("expire_hours") as string) : null;

      if (!material_id || !material_title || class_ids.length === 0) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Get old URLs for deletion
      const [oldRows]: any = await db.query(
        "SELECT material_video_url, material_pdf_url, material_imageurl FROM materials WHERE material_id = ? LIMIT 1",
        [material_id]
      );
      const old = oldRows.length > 0 ? oldRows[0] : {};

      const deleteIfChanged = (newUrl: string | null, oldUrl: string | null) => {
        if ((newUrl === "" || newUrl === null) && oldUrl) {
          const filePath = path.join(process.cwd(), "public", oldUrl);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } else if (newUrl && newUrl !== oldUrl && oldUrl) {
          const oldPath = path.join(process.cwd(), "public", oldUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      };

      deleteIfChanged(material_video_url, old.material_video_url);
      deleteIfChanged(material_pdf_url, old.material_pdf_url);
      deleteIfChanged(material_imageurl, old.material_imageurl);

      // Remove old assignments
      await db.query("DELETE FROM materials WHERE material_id = ?", [material_id]);

      // Insert new assignments
      for (const class_id of class_ids) {
        await db.query(
          `INSERT INTO materials (
            material_id, material_title, material_description, material_type, material_link,
            material_video_url, material_pdf_url, material_imageurl, class_id,
            downloadable, view_count_enabled, view_limit, expire_hours, create_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            material_id,
            material_title,
            material_description,
            material_type,
            material_link,
            material_video_url || null,
            material_pdf_url || null,
            material_imageurl || null,
            class_id,
            downloadable,
            view_count_enabled,
            view_limit,
            expire_hours,
          ]
        );
      }

      return NextResponse.json({ success: true, message: "Material updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in materials route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}