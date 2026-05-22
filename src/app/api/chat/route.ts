import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { chatMessages, members, albums, photos } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { eq, desc, like } from "drizzle-orm";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_albums",
      description: "获取家庭相册中所有的相册列表，包括相册名称、照片数量、创建时间",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_album",
      description: "根据相册名称打开对应相册，获取相册详情和照片列表。用户说'打开xx相册''看看xx''进入xx'时调用",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "相册名称，支持模糊匹配" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_album",
      description: "创建一个新的家庭相册",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "相册名称，1-50个字符" },
          description: { type: "string", description: "相册描述，可选" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_album",
      description: "删除一个相册及其所有照片。需要用户明确确认后才调用。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "要删除的相册名称" },
        },
        required: ["name"],
      },
    },
  },
];

const SYSTEM_PROMPT = `你是"小智"，一个温馨的家庭助手。你可以通过工具箱查询和操作家庭相册。

重要：你拥有实际操作相册的能力！
- list_albums：查看所有相册
- open_album：打开指定相册（用户说"打开xx""看看xx""进入xx相册"时调用）
- create_album：创建新相册（用户说"新建xx相册""创建xx"时调用）
- delete_album：删除相册（危险操作，需要用户明确确认）

行为准则：
- 像家人一样自然对话，用简体中文，适当使用表情符号
- 用户提到相册操作时，直接调用工具执行，不要问"要不要帮你"
- 对于删除操作，必须先向用户确认后再调用工具
- 对于实时信息（天气、新闻等），诚实告知查不到
- 回答简洁，一般不超过200字`;

// 工具函数的返回值，可能包含前端导航指令
interface ToolResult {
  data: unknown;
  action?: { type: "navigate"; url: string };
}

async function callDeepSeek(messages: Record<string, unknown>[], withTools: boolean) {
  const body: Record<string, unknown> = {
    model: "deepseek-chat",
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  };
  if (withTools) {
    body.tools = TOOLS;
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("DeepSeek API error:", errorData);
    throw new Error(`AI服务错误: ${response.status}`);
  }

  return response.json();
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const db = getDb();

  switch (name) {
    case "list_albums": {
      const data = await db.select().from(albums).orderBy(desc(albums.updatedAt));
      return {
        data: data.map((a) => ({
          id: a.id,
          name: a.name,
          photoCount: a.photoCount,
          createdAt: a.createdAt,
        })),
      };
    }

    case "open_album": {
      const searchName = String(args.name || "");
      // 先精确匹配，再模糊匹配
      let album = await db.select().from(albums).where(eq(albums.name, searchName)).get();
      if (!album) {
        album = await db.select().from(albums).where(like(albums.name, `%${searchName}%`)).get();
      }

      if (!album) {
        return { data: { error: `未找到名为"${searchName}"的相册` } };
      }

      // 获取该相册的照片
      const photoList = await db
        .select()
        .from(photos)
        .where(eq(photos.albumId, album.id))
        .orderBy(desc(photos.createdAt))
        .limit(20);

      return {
        data: {
          id: album.id,
          name: album.name,
          description: album.description,
          photoCount: album.photoCount,
          createdAt: album.createdAt,
          recentPhotos: photoList.map((p) => ({
            id: p.id,
            thumbnailUrl: p.thumbnailUrl,
            createdAt: p.createdAt,
          })),
        },
        action: { type: "navigate", url: `/a/${album.id}` },
      };
    }

    case "create_album": {
      const albumName = String(args.name || "").trim();
      if (!albumName || albumName.length > 50) {
        return { data: { error: "相册名称需要1-50个字符" } };
      }

      const id = generateId();
      const now = new Date().toISOString();
      await db.insert(albums).values({
        id,
        name: albumName,
        description: String(args.description || ""),
        createdAt: now,
        updatedAt: now,
      });

      return {
        data: { id, name: albumName, description: args.description || "", photoCount: 0 },
        action: { type: "navigate", url: `/a/${id}` },
      };
    }

    case "delete_album": {
      const searchName = String(args.name || "");
      let album = await db.select().from(albums).where(eq(albums.name, searchName)).get();
      if (!album) {
        album = await db.select().from(albums).where(like(albums.name, `%${searchName}%`)).get();
      }

      if (!album) {
        return { data: { error: `未找到名为"${searchName}"的相册` } };
      }

      await db.delete(albums).where(eq(albums.id, album.id));
      return { data: { deleted: true, name: album.name } };
    }

    default:
      return { data: { error: `未知工具: ${name}` } };
  }
}

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

    // 确保成员存在
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
    }

    // 获取历史消息
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
    const messages: Record<string, unknown>[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role as string,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // 第一次调用 DeepSeek（带 tools）
    const data = await callDeepSeek(messages, true);
    const choice = data.choices[0]?.message;

    let assistantContent: string;
    let action: { type: "navigate"; url: string } | undefined;

    // 如果模型调用了工具
    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: choice.tool_calls,
      });

      for (const tc of choice.tool_calls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments || "{}");
        console.log(`[Chat] 执行工具: ${fnName}`, fnArgs);

        const result = await executeTool(fnName, fnArgs);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result.data),
        });

        // 取最后一个工具的导航指令
        if (result.action) {
          action = result.action;
        }
      }

      const data2 = await callDeepSeek(messages, false);
      assistantContent = data2.choices[0]?.message?.content || "抱歉，我暂时无法回答。";
    } else {
      assistantContent = choice?.content || "抱歉，我暂时无法回答。";
    }

    // 保存助手回复
    try {
      await db.insert(chatMessages).values({
        id: generateId(),
        memberId,
        role: "assistant",
        content: assistantContent,
      });
    } catch (saveError) {
      console.error("Save assistant message error:", saveError);
    }

    return Response.json({
      data: {
        id: generateId(),
        role: "assistant",
        content: assistantContent,
        createdAt: new Date().toISOString(),
        action,
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
