import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { chatMessages, members } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { eq, desc } from "drizzle-orm";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const SYSTEM_PROMPT = `你是一个温馨的家庭相册助手，名叫"小智"。你的职责是：

1. **角色定位**：你是家庭成员的贴心伙伴，语气要亲切、温暖、幽默
2. **主要功能**：
   - 回答家庭成员的问题
   - 提供生活建议
   - 讲笑话、故事
   - 天气查询建议
   - 纪念日提醒
3. **语言风格**：
   - 使用简体中文
   - 适当使用表情符号
   - 像家人一样自然对话
   - 避免过于正式或机械

记住：你是在帮助一个家庭更好地互动和记录美好时光。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, memberId } = body;

    if (!message || !memberId) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (!DEEPSEEK_API_KEY) {
      return Response.json({ error: "AI服务未配置" }, { status: 500 });
    }

    const db = getDb();

    // 确保成员存在，如果不存在则创建
    const existingMember = await db.select().from(members).where(eq(members.id, memberId)).get();
    if (!existingMember) {
      await db.insert(members).values({
        id: memberId,
        nickname: "访客用户",
        avatarColor: "stone",
        createdAt: new Date().toISOString(),
      });
    }

    // 保存用户消息
    try {
      await db.insert(chatMessages).values({
        id: generateId(),
        memberId,
        role: "user",
        content: message,
      });
    } catch (saveError) {
      console.error("Save user message error:", saveError);
      // 继续执行，不影响主流程
    }

    // 获取最近20条历史消息作为上下文
    let history;
    try {
      history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.memberId, memberId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(20)
        .then((rows) => rows.reverse());
    } catch (historyError) {
      console.error("Load history error:", historyError);
      history = [];
    }

    // 构建消息数组
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // 调用 DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("DeepSeek API error:", errorData);
      throw new Error(`AI服务错误: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "抱歉，我暂时无法回答。";

    // 保存助手回复
    try {
      await db.insert(chatMessages).values({
        id: generateId(),
        memberId,
        role: "assistant",
        content: assistantMessage,
      });
    } catch (saveError) {
      console.error("Save assistant message error:", saveError);
      // 继续返回结果
    }

    return Response.json({
      data: {
        id: generateId(),
        role: "assistant",
        content: assistantMessage,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return Response.json({ error: "缺少memberId参数" }, { status: 400 });
    }

    const db = getDb();

    let messages;
    try {
      messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.memberId, memberId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(50)
        .then((rows) => rows.reverse());
    } catch (error) {
      console.error("Get chat messages error:", error);
      messages = [];
    }

    return Response.json({ data: messages });
  } catch (error) {
    console.error("Get chat messages error:", error);
    return Response.json({ error: "获取消息失败" }, { status: 500 });
  }
}