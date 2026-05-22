import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { comments, photos, members } from "@/lib/db/schema";
import { addCommentSchema } from "@/lib/validators";
import { generateId } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const photoId = searchParams.get("photoId");
  if (!photoId) {
    return Response.json({ error: "照片ID不能为空" }, { status: 400 });
  }

  const db = getDb();
  const data = await db
    .select({
      ...comments,
      nickname: members.nickname,
    })
    .from(comments)
    .leftJoin(members, eq(comments.memberId, members.id))
    .where(eq(comments.photoId, photoId))
    .orderBy(comments.createdAt);

  return Response.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = addCommentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "评论长度应为1-500个字符" }, { status: 400 });
  }

  const { photoId, memberId } = body as { photoId: string; memberId: string };
  if (!photoId || !memberId) {
    return Response.json({ error: "照片ID和成员ID不能为空" }, { status: 400 });
  }

  const db = getDb();

  // Verify photo exists
  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId));
  if (!photo) {
    return Response.json({ error: "Photo not found" }, { status: 404 });
  }

  const id = generateId();
  const comment = {
    id,
    photoId,
    memberId,
    content: parsed.data.content,
    createdAt: new Date().toISOString(),
  };

  await db.insert(comments).values(comment);

  // Update comment count
  await db
    .update(photos)
    .set({ commentCount: (photo.commentCount || 0) + 1 })
    .where(eq(photos.id, photoId));

  return Response.json({ data: comment }, { status: 201 });
}
