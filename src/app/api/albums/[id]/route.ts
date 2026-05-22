import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { albums, photos } from "@/lib/db/schema";
import { deleteAlbumDir } from "@/lib/storage/delete";
import { eq, desc } from "drizzle-orm";

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

  // Delete local files
  deleteAlbumDir(id);

  // CASCADE deletes photos, comments, likes
  await db.delete(albums).where(eq(albums.id, id));

  return Response.json({ data: { success: true } });
}
