import { NextResponse } from "next/server";
import { getS3Client, isR2Configured } from "@/lib/r2StorageManager";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key || key.includes("..")) {
    return new NextResponse("Invalid media key", { status: 400 });
  }

  const rangeHeader = req.headers.get("range");

  // 1. If R2 is configured, stream directly from R2
  if (isR2Configured()) {
    try {
      const s3 = getS3Client();
      const bucket = process.env.R2_BUCKET_NAME!;

      const cmd = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: rangeHeader || undefined,
      });

      const s3Res = await s3.send(cmd);

      if (!s3Res.Body) {
        return new NextResponse("Not Found", { status: 404 });
      }

      const headers = new Headers();
      const ext = path.extname(key).toLowerCase();
      const contentType =
        s3Res.ContentType ||
        (ext === ".mp4" ? "video/mp4" : ext === ".pdf" ? "application/pdf" : ext === ".webm" ? "video/webm" : "application/octet-stream");

      headers.set("Content-Type", contentType);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      if (s3Res.ContentLength !== undefined) {
        headers.set("Content-Length", s3Res.ContentLength.toString());
      }
      if (s3Res.ContentRange) {
        headers.set("Content-Range", s3Res.ContentRange);
      }

      // Convert Node readable stream to web ReadableStream
      const bodyStream: any = s3Res.Body;
      const webStream = typeof bodyStream.transformToWebStream === "function"
        ? bodyStream.transformToWebStream()
        : Readable.toWeb(bodyStream as Readable);

      return new NextResponse(webStream, {
        status: s3Res.ContentRange ? 206 : 200,
        headers,
      });
    } catch (err: any) {
      console.error("[MEDIA STREAM ERROR]", err.message);
      return new NextResponse("Error streaming media", { status: 500 });
    }
  }

  // 2. Fallback to local files if stored locally
  const localPath = path.join(process.cwd(), "public", "uploads", key);
  if (!fs.existsSync(localPath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const stat = fs.statSync(localPath);
  const fileSize = stat.size;
  const ext = path.extname(key).toLowerCase();
  const contentType = ext === ".mp4" ? "video/mp4" : ext === ".pdf" ? "application/pdf" : "application/octet-stream";

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(localPath, { start, end });

    return new NextResponse(Readable.toWeb(fileStream) as any, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": contentType,
      },
    });
  }

  const fileStream = fs.createReadStream(localPath);
  return new NextResponse(Readable.toWeb(fileStream) as any, {
    status: 200,
    headers: {
      "Content-Length": fileSize.toString(),
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    },
  });
}
