import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { albums, photos, comments, likes } from "@/lib/db/schema";
import { deleteAlbumDir } from "@/lib/storage/delete";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/albums/[id]">
) {
  const { id } = await ctx.params;
  const db = getDb();
  const [album] = await db.select().from(albums).where(eq(albums.id, id));
  if (!album) {
    return Response.json({ error: "相册不存在" }, { status: 404 });
  }

  const latestPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.albumId, id))
    .orderBy(desc(photos.createdAt))
    .limit(3);

  return Response.json({ data: { ...album, latestPhotos } });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/albums/[id]">
) {
  const { id } = await ctx.params;
  const db = getDb();

  const [album] = await db.select().from(albums).where(eq(albums.id, id));
  if (!album) {
    return Response.json({ error: "相册不存在" }, { status: 404 });
  }

  // 查出该相册下所有照片 id
  const photoRows = await db.select({ id: photos.id }).from(photos).where(eq(photos.albumId, id));
  const photoIds = photoRows.map((p) => p.id);

  // 手动级联：先删评论和点赞，再删照片，最后删相册
  if (photoIds.length > 0) {
    await db.delete(comments).where(inArray(comments.photoId, photoIds));
    await db.delete(likes).where(inArray(likes.photoId, photoIds));
  }
  await db.delete(photos).where(eq(photos.albumId, id));
  await db.delete(albums).where(eq(albums.id, id));

  // 删除本地文件（最后执行，保证数据库先清理）
  deleteAlbumDir(id);

  return Response.json({ data: { success: true } });
}
