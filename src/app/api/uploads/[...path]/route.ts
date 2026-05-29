import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/uploads/[...path]">
) {
  const { path: segments } = await ctx.params;
  const filePath = path.join(UPLOAD_DIR, ...segments);

  if (!fs.existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };

  const stream = fs.createReadStream(filePath);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": contentType[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
