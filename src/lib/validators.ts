import { z } from "zod";

export const createMemberSchema = z.object({
  nickname: z.string().min(1).max(20).trim(),
});

export const createAlbumSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim().optional(),
});

export const addCommentSchema = z.object({
  content: z.string().min(1).max(500).trim(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
