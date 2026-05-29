import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { albums, photos, comments, likes } from "@/lib/db/schema";
import { deleteAlbumDir } from "@/lib/storage/delete";
import { eq, desc, inArray } from "drizzle-orm";

const RENAME_LIMIT = 50;

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

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/albums/[id]">
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "相册名称不能为空" }, { status: 400 });
  }
  if (name.trim().length > RENAME_LIMIT) {
    return Response.json({ error: `相册名称不能超过${RENAME_LIMIT}个字符` }, { status: 400 });
  }

  const db = getDb();

  const [album] = await db.select().from(albums).where(eq(albums.id, id));
  if (!album) {
    return Response.json({ error: "相册不存在" }, { status: 404 });
  }

  await db
    .update(albums)
    .set({ name: name.trim(), updatedAt: new Date().toISOString() })
    .where(eq(albums.id, id));

  return Response.json({ data: { id, name: name.trim() } });
}
