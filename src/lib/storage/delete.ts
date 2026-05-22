import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

function urlToPath(url: string): string {
  // /api/uploads/... -> data/uploads/...
  const relative = url.replace(/^\/api\/uploads\//, "");
  return path.join(UPLOAD_DIR, relative);
}

export function deletePhoto(originalUrl: string, thumbnailUrl: string): void {
  for (const url of [originalUrl, thumbnailUrl]) {
    try {
      const filePath = urlToPath(url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore
    }
  }
}

export function deleteAlbumDir(albumId: string): void {
  const albumDir = path.join(UPLOAD_DIR, "albums", albumId);
  if (fs.existsSync(albumDir)) {
    fs.rmSync(albumDir, { recursive: true, force: true });
  }
}
