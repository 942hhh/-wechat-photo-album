import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { photos, albums, members } from "@/lib/db/schema";
import { uploadPhoto } from "@/lib/storage/upload";
import { generateId } from "@/lib/utils";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const albumId = searchParams.get("albumId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 50);

  const db = getDb();
  const data = await db
    .select({
      id: photos.id,
      albumId: photos.albumId,
      uploadedBy: photos.uploadedBy,
      r2KeyOriginal: photos.r2KeyOriginal,
      r2KeyThumb: photos.r2KeyThumb,
      originalUrl: photos.originalUrl,
      thumbnailUrl: photos.thumbnailUrl,
      width: photos.width,
      height: photos.height,
      fileSize: photos.fileSize,
      contentType: photos.contentType,
      description: photos.description,
      likeCount: photos.likeCount,
      commentCount: photos.commentCount,
      createdAt: photos.createdAt,
      uploaderNickname: members.nickname,
    })
    .from(photos)
    .leftJoin(members, eq(photos.uploadedBy, members.id))
    .where(albumId ? eq(photos.albumId, albumId) : undefined)
    .orderBy(asc(photos.createdAt))
    .limit(limit + 1);

  const hasMore = data.length > limit;
  const result = hasMore ? data.slice(0, limit) : data;

  return Response.json({
    data: {
      photos: result,
      nextCursor: hasMore ? result[result.length - 1].createdAt : null,
    },
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const albumId = formData.get("albumId") as string | null;
  const memberId = formData.get("memberId") as string | null;
  const description = (formData.get("description") as string) || "";

  if (!file || !albumId) {
    return Response.json({ error: "文件和相册ID不能为空" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "只允许上传图片" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return Response.json({ error: "文件大小不能超过20MB" }, { status: 400 });
  }

  const db = getDb();

  // Verify album exists
  const [album] = await db.select().from(albums).where(eq(albums.id, albumId));
  if (!album) {
    return Response.json({ error: "Album not found" }, { status: 404 });
  }

  let uploadResult;
  try {
    uploadResult = await uploadPhoto(file, albumId);
  } catch {
    return Response.json({ error: "上传失败" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const photoId = generateId();

  const photo = {
    id: photoId,
    albumId,
    uploadedBy: memberId || null,
    r2KeyOriginal: "",
    r2KeyThumb: "",
    originalUrl: uploadResult.originalUrl,
    thumbnailUrl: uploadResult.thumbnailUrl,
    width: uploadResult.width,
    height: uploadResult.height,
    fileSize: uploadResult.fileSize,
    contentType: file.type,
    description,
    createdAt: now,
  };

  await db.insert(photos).values(photo);

  // Update album counters
  await db
    .update(albums)
    .set({
      photoCount: (album.photoCount || 0) + 1,
      coverPhotoUrl: album.coverPhotoUrl || uploadResult.thumbnailUrl,
      latestPhotoAt: now,
      updatedAt: now,
    })
    .where(eq(albums.id, albumId));

  return Response.json({ data: photo }, { status: 201 });
}
