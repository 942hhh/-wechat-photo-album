import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  avatarColor: text("avatar_color").notNull().default("stone"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  coverPhotoUrl: text("cover_photo_url"),
  createdBy: text("created_by").references(() => members.id, { onDelete: "set null" }),
  photoCount: integer("photo_count").notNull().default(0),
  latestPhotoAt: text("latest_photo_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by").references(() => members.id, { onDelete: "set null" }),
    r2KeyOriginal: text("r2_key_original").default(""),
    r2KeyThumb: text("r2_key_thumb").default(""),
    originalUrl: text("original_url").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    width: integer("width"),
    height: integer("height"),
    fileSize: integer("file_size"),
    contentType: text("content_type").notNull(),
    description: text("description").default(""),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    // 移除 album_id 的唯一约束，允许一个相册有多张照片
  ]
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("idx_comments_photo_id").on(table.photoId)]
);

export const likes = sqliteTable(
  "likes",
  {
    id: text("id").primaryKey(),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("idx_likes_photo_member").on(table.photoId, table.memberId),
  ]
);

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Member = typeof members.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
