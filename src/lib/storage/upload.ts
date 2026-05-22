import sharp from "sharp";
import fs from "fs";
import path from "path";
import { generateId } from "@/lib/utils";

// Store OUTSIDE public/ to avoid Turbopack hot reload during uploads
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

interface UploadResult {
  originalUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

export async function uploadPhoto(
  file: File,
  albumId: string
): Promise<UploadResult> {
  const photoId = generateId();
  const buffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(buffer).metadata();

  const ext = file.type === "image/png" ? "png" : "jpg";
  const albumDir = path.join(UPLOAD_DIR, "albums", albumId);
  const originalsDir = path.join(albumDir, "originals");
  const thumbsDir = path.join(albumDir, "thumbnails");

  fs.mkdirSync(originalsDir, { recursive: true });
  fs.mkdirSync(thumbsDir, { recursive: true });

  const originalFilename = `${photoId}.${ext}`;
  const thumbFilename = `${photoId}.webp`;

  const thumbBuffer = await sharp(buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  fs.writeFileSync(path.join(originalsDir, originalFilename), buffer);
  fs.writeFileSync(path.join(thumbsDir, thumbFilename), thumbBuffer);

  return {
    originalUrl: `/api/uploads/albums/${albumId}/originals/${originalFilename}`,
    thumbnailUrl: `/api/uploads/albums/${albumId}/thumbnails/${thumbFilename}`,
    width: metadata.width || 0,
    height: metadata.height || 0,
    fileSize: buffer.length,
  };
}
