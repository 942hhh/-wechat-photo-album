import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { comments, photos, members } from "@/lib/db/schema";
import { addCommentSchema } from "@/lib/validators";
import { generateId } from "@/lib/utils";
import { eq, isNull, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const photoId = searchParams.get("photoId");
  if (!photoId) {
    return Response.json({ error: "照片ID不能为空" }, { status: 400 });
  }

  const db = getDb();
  const allComments = await db
    .select({
      id: comments.id,
      photoId: comments.photoId,
      memberId: comments.memberId,
      parentId: comments.parentId,
      content: comments.content,
      likeCount: comments.likeCount,
      createdAt: comments.createdAt,
      nickname: members.nickname,
    })
    .from(comments)
    .leftJoin(members, eq(comments.memberId, members.id))
    .where(eq(comments.photoId, photoId))
    .orderBy(comments.createdAt);

  const topLevel = allComments.filter((c) => !c.parentId);
  const replies = allComments.filter((c) => c.parentId);

  // Find reply target nicknames
  const parentNicknameMap = new Map<string, string>();
  for (const r of replies) {
    if (r.parentId) {
      const parent = allComments.find((c) => c.id === r.parentId);
      if (parent?.nickname) parentNicknameMap.set(r.id, parent.nickname);
    }
  }

  const data = topLevel.map((c) => ({
    ...c,
    replies: replies
      .filter((r) => r.parentId === c.id)
      .map((r) => ({
        ...r,
        replyToNickname: parentNicknameMap.get(r.id) || null,
      })),
  }));

  return Response.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = addCommentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "评论长度应为1-500个字符" }, { status: 400 });
  }

  const { photoId, memberId, parentId } = body as {
    photoId: string;
    memberId: string;
    parentId?: string;
  };
  if (!photoId || !memberId) {
    return Response.json({ error: "照片ID和成员ID不能为空" }, { status: 400 });
  }

  const db = getDb();

  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId));
  if (!photo) {
    return Response.json({ error: "Photo not found" }, { status: 404 });
  }

  // If parentId, verify parent comment exists and belongs to same photo
  if (parentId) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, parentId));
    if (!parent) {
      return Response.json({ error: "父评论不存在" }, { status: 404 });
    }
    if (parent.photoId !== photoId) {
      return Response.json({ error: "父评论不属于该照片" }, { status: 400 });
    }
  }

  const id = generateId();
  const comment = {
    id,
    photoId,
    memberId,
    parentId: parentId || null,
    content: parsed.data.content,
    createdAt: new Date().toISOString(),
  };

  await db.insert(comments).values(comment);

  await db
    .update(photos)
    .set({ commentCount: (photo.commentCount || 0) + 1 })
    .where(eq(photos.id, photoId));

  return Response.json({ data: comment }, { status: 201 });
}
