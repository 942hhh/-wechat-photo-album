import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { photos, albums, members, comments, likes } from "@/lib/db/schema";
import { deletePhoto } from "@/lib/storage/delete";
import { eq, desc, and, lt, gt, or, asc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/photos/[id]">
) {
  const { id } = await ctx.params;
  const db = getDb();

  const [photo] = await db
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
    .where(eq(photos.id, id));
  if (!photo) {
    return Response.json({ error: "照片不存在" }, { status: 404 });
  }

  // Get prev/next within same album
  const prev = await db
    .select({ id: photos.id })
    .from(photos)
    .where(
      and(
        eq(photos.albumId, photo.albumId),
        or(
          lt(photos.createdAt, photo.createdAt),
          and(eq(photos.createdAt, photo.createdAt), lt(photos.id, photo.id))
        )
      )
    )
    .orderBy(desc(photos.createdAt), desc(photos.id))
    .limit(1);

  const next = await db
    .select({ id: photos.id })
    .from(photos)
    .where(
      and(
        eq(photos.albumId, photo.albumId),
        or(
          gt(photos.createdAt, photo.createdAt),
          and(eq(photos.createdAt, photo.createdAt), gt(photos.id, photo.id))
        )
      )
    )
    .orderBy(asc(photos.createdAt), asc(photos.id))
    .limit(1);

  return Response.json({
    data: {
      ...photo,
      prevId: prev[0]?.id || null,
      nextId: next[0]?.id || null,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/photos/[id]">
) {
  const { id } = await ctx.params;
  const db = getDb();

  const [photo] = await db.select().from(photos).where(eq(photos.id, id));
  if (!photo) {
    return Response.json({ error: "照片不存在" }, { status: 404 });
  }

  // 手动级联删评论和点赞
  await db.delete(comments).where(eq(comments.photoId, id));
  await db.delete(likes).where(eq(likes.photoId, id));

  // 删照片
  await db.delete(photos).where(eq(photos.id, id));

  // 删除本地文件
  deletePhoto(photo.originalUrl, photo.thumbnailUrl);

  // 重新统计相册照片数，更新计数和封面
  const remaining = await db.select({ id: photos.id }).from(photos).where(eq(photos.albumId, photo.albumId as string));
  const newCount = remaining.length;
  await db
    .update(albums)
    .set({
      photoCount: newCount,
      coverPhotoUrl: newCount === 0 ? null : undefined,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(albums.id, photo.albumId as string));

  return Response.json({ data: { success: true } });
}
