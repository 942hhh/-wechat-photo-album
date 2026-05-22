import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { createMemberSchema } from "@/lib/validators";
import { generateId } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "昵称长度为1-20个字符" }, { status: 400 });
  }

  const db = getDb();
  const id = generateId();
  const member = { id, nickname: parsed.data.nickname, avatarColor: "stone", createdAt: new Date().toISOString() };

  await db.insert(members).values(member);
  return Response.json({ data: member }, { status: 201 });
}
