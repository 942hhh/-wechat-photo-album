import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { likes, photos } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const photoId = searchParams.get("photoId");
  const memberId = searchParams.get("memberId");
  if (!photoId || !memberId) {
    return Response.json({ error: "照片ID和成员ID不能为空" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(likes)
    .where(and(eq(likes.photoId, photoId), eq(likes.memberId, memberId)));

  const [photo] = await db
    .select({ likeCount: photos.likeCount })
    .from(photos)
    .where(eq(photos.id, photoId));

  return Response.json({
    data: {
      liked: !!existing,
      likeCount: photo?.likeCount || 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { photoId, memberId } = body as { photoId: string; memberId: string };

  if (!photoId || !memberId) {
    return Response.json({ error: "照片ID和成员ID不能为空" }, { status: 400 });
  }

  const db = getDb();

  // Check if already liked
  const [existing] = await db
    .select()
    .from(likes)
    .where(and(eq(likes.photoId, photoId), eq(likes.memberId, memberId)));

  if (existing) {
    // Unlike
    await db.delete(likes).where(eq(likes.id, existing.id));
    const [photo] = await db
      .select({ likeCount: photos.likeCount })
      .from(photos)
      .where(eq(photos.id, photoId));
    await db
      .update(photos)
      .set({ likeCount: Math.max(0, (photo?.likeCount || 0) - 1) })
      .where(eq(photos.id, photoId));
    return Response.json({
      data: { liked: false, likeCount: Math.max(0, (photo?.likeCount || 0) - 1) },
    });
  }

  // Like
  const id = generateId();
  await db.insert(likes).values({
    id,
    photoId,
    memberId,
    createdAt: new Date().toISOString(),
  });

  const [photo] = await db
    .select({ likeCount: photos.likeCount })
    .from(photos)
    .where(eq(photos.id, photoId));

  const newCount = (photo?.likeCount || 0) + 1;
  await db
    .update(photos)
    .set({ likeCount: newCount })
    .where(eq(photos.id, photoId));

  return Response.json({ data: { liked: true, likeCount: newCount } });
}
