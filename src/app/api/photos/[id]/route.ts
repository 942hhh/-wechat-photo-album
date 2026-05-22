import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { photos, albums, members } from "@/lib/db/schema";
import { deletePhoto } from "@/lib/storage/delete";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/photos/[id]">
) {
  const { id } = await ctx.params;
  const db = getDb();

  const [photo] = await db
    .select({
      ...photos,
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
        eq(photos.createdAt, photo.createdAt)
      )
    )
    .orderBy(desc(photos.createdAt))
    .limit(1);

  const next = await db
    .select({ id: photos.id })
    .from(photos)
    .where(
      and(
        eq(photos.albumId, photo.albumId),
        eq(photos.createdAt, photo.createdAt)
      )
    )
    .orderBy(photos.createdAt)
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

  // Delete local files
  deletePhoto(photo.originalUrl, photo.thumbnailUrl);

  // Delete DB row
  await db.delete(photos).where(eq(photos.id, id));

  // Decrement album count
  await db
    .update(albums)
    .set({
      photoCount: Math.max(0, (await db.select().from(albums).where(eq(albums.id, photo.albumId)))[0]?.photoCount ?? 1) - 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(albums.id, photo.albumId));

  return Response.json({ data: { success: true } });
}
