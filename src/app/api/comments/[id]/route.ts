import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { comments, photos, likes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/comments/[id]">
) {
  const { id } = await ctx.params;
  const db = getDb();

  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id));

  if (!comment) {
    return Response.json({ error: "评论不存在" }, { status: 404 });
  }

  // Count children (replies) for comment_count adjustment
  const children = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.parentId, id));
  const childCount = children.length;

  // Delete likes on this comment and all child comments
  await db.delete(likes).where(eq(likes.commentId, id));
  for (const child of children) {
    await db.delete(likes).where(eq(likes.commentId, child.id));
  }

  // Delete child comments
  await db.delete(comments).where(eq(comments.parentId, id));

  // Delete the comment itself
  await db.delete(comments).where(eq(comments.id, id));

  // Decrement comment count
  const [photo] = await db
    .select()
    .from(photos)
    .where(eq(photos.id, comment.photoId));
  if (photo) {
    await db
      .update(photos)
      .set({
        commentCount: Math.max(0, (photo.commentCount || 0) - 1 - childCount),
      })
      .where(eq(photos.id, comment.photoId));
  }

  return Response.json({ data: { success: true } });
}
