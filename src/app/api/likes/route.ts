import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { likes, photos, comments } from "@/lib/db/schema";
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
  const { photoId, commentId, memberId } = body as {
    photoId?: string;
    commentId?: string;
    memberId: string;
  };

  if (!memberId) {
    return Response.json({ error: "成员ID不能为空" }, { status: 400 });
  }
  if (!photoId && !commentId) {
    return Response.json(
      { error: "照片ID和评论ID不能同时为空" },
      { status: 400 }
    );
  }

  const db = getDb();

  // ---- Comment like / unlike ----
  if (commentId) {
    const [existing] = await db
      .select()
      .from(likes)
      .where(
        and(eq(likes.commentId, commentId), eq(likes.memberId, memberId))
      );

    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      const [comment] = await db
        .select({ likeCount: comments.likeCount })
        .from(comments)
        .where(eq(comments.id, commentId));
      const newCount = Math.max(0, (comment?.likeCount || 0) - 1);
      await db
        .update(comments)
        .set({ likeCount: newCount })
        .where(eq(comments.id, commentId));
      return Response.json({ data: { liked: false, likeCount: newCount } });
    }

    const id = generateId();
    await db.insert(likes).values({
      id,
      commentId,
      memberId,
      createdAt: new Date().toISOString(),
    });

    const [comment] = await db
      .select({ likeCount: comments.likeCount })
      .from(comments)
      .where(eq(comments.id, commentId));
    const newCount = (comment?.likeCount || 0) + 1;
    await db
      .update(comments)
      .set({ likeCount: newCount })
      .where(eq(comments.id, commentId));
    return Response.json({ data: { liked: true, likeCount: newCount } });
  }

  // ---- Photo like / unlike ----
  if (photoId) {
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.photoId, photoId), eq(likes.memberId, memberId)));

    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      const [photo] = await db
        .select({ likeCount: photos.likeCount })
        .from(photos)
        .where(eq(photos.id, photoId));
      const newCount = Math.max(0, (photo?.likeCount || 0) - 1);
      await db
        .update(photos)
        .set({ likeCount: newCount })
        .where(eq(photos.id, photoId));
      return Response.json({ data: { liked: false, likeCount: newCount } });
    }

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

  return Response.json({ error: "无效请求" }, { status: 400 });
}
