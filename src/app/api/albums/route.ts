import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { albums } from "@/lib/db/schema";
import { createAlbumSchema } from "@/lib/validators";
import { generateId } from "@/lib/utils";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const data = await db.select().from(albums).orderBy(asc(albums.createdAt));
  return Response.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "相册数据无效" }, { status: 400 });
  }

  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();
  const album = {
    id,
    name: parsed.data.name,
    description: parsed.data.description || "",
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(albums).values(album);
  return Response.json({ data: album }, { status: 201 });
}
