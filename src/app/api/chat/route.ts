import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { chatMessages, members, albums, photos, comments, likes } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { eq, desc, like, inArray } from "drizzle-orm";

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
  {
    type: "function" as const,
    function: {
      name: "query_photos",
      description: "查询照片信息。可按上传者昵称或相册名称筛选。用于回答'xx上传了几张照片''一共有多少张照片''哪些人上传了照片'等统计类问题",
      parameters: {
        type: "object",
        properties: {
          uploaderNickname: { type: "string", description: "上传者的昵称，如'妈妈''爸爸'。不传则查全部" },
          albumName: { type: "string", description: "相册名称。不传则查全部" },
        },
      },
    },
  },
];

const SYSTEM_PROMPT = `你是"小智"，一个温馨的家庭助手。

⚠️ 铁律：关于本家庭相册的任何数据问题（照片数量、相册列表、谁上传了照片等等），你必须调用工具箱获取真实数据，绝对不允许编造、猜测或凭常识回答。你没有这个家庭的任何预知信息。

你可以使用以下工具：
- list_albums：查看所有相册
- open_album：打开指定相册（用户说"打开xx""看看xx""进入xx相册"时调用）
- create_album：创建新相册（用户说"新建xx相册""创建xx"时调用）
- delete_album：删除相册（危险操作，需要用户明确确认）
- query_photos：查询照片统计（用户问"xx上传了几张照片""谁上传了照片""一共有多少照片"时调用）

行为准则：
- 像家人一样自然对话，用简体中文，适当使用表情符号
- 用户提到相册操作时，直接调用工具执行，不要问"要不要帮你"
- 对于删除操作，必须先向用户确认后再调用工具
- 对于实时信息（天气、新闻等），诚实告知查不到
- 回答简洁，一般不超过200字

统计类问题处理：
- "谁上传了照片""哪些人传了""哪个相册最多"→调用query_photos()不带参数，然后根据byUploader/byAlbum数据回答
- "xx上传了几张"→调用query_photos(uploaderNickname="xx")
- "一共有多少张照片"→调用query_photos()，回答total
- 查询结果为空时，友好告知"还没有照片哦～"
- 用户意图模糊时（如"看看照片"），追问"想看哪个相册的呢？"

空数据指引：
- 没有相册时说"还没有创建相册哦，你可以对我说'新建一个相册'"
- 没有照片时说"这个相册还是空的，快去上传第一张照片吧！"`;

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
    body.tool_choice = "auto";
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

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  console.log("[DeepSeek] 回复类型:", msg?.tool_calls ? `tool_calls(${msg.tool_calls.length}个)` : "纯文本");
  if (msg?.content) {
    console.log("[DeepSeek] 文本内容:", typeof msg.content === "string" ? msg.content.slice(0, 100) : msg.content);
  }
  return data;
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

      // 手动级联删除照片、评论、点赞
      const photoRows = await db.select({ id: photos.id }).from(photos).where(eq(photos.albumId, album.id));
      const photoIds = photoRows.map((p) => p.id);
      if (photoIds.length > 0) {
        await db.delete(comments).where(inArray(comments.photoId, photoIds));
        await db.delete(likes).where(inArray(likes.photoId, photoIds));
      }
      await db.delete(photos).where(eq(photos.albumId, album.id));
      await db.delete(albums).where(eq(albums.id, album.id));
      return { data: { deleted: true, name: album.name } };
    }

    case "query_photos": {
      const uploaderNickname = args.uploaderNickname ? String(args.uploaderNickname) : "";
      const albumName = args.albumName ? String(args.albumName) : "";

      // 解析上传者 memberId
      let uploaderId: string | null = null;
      if (uploaderNickname) {
        const member = await db.select().from(members).where(eq(members.nickname, uploaderNickname)).get();
        if (!member) {
          return { data: { error: `未找到昵称为"${uploaderNickname}"的成员` } };
        }
        uploaderId = member.id;
      }

      // 解析相册 id
      let albumId: string | null = null;
      if (albumName) {
        const album = await db.select().from(albums).where(eq(albums.name, albumName)).get();
        if (!album) {
          return { data: { error: `未找到名为"${albumName}"的相册` } };
        }
        albumId = album.id;
      }

      // 查询全部照片，在内存中过滤（家庭相册数据量不大）
      const allPhotos = await db.select().from(photos).orderBy(desc(photos.createdAt));
      const allMembers = await db.select().from(members);
      const allAlbums = await db.select().from(albums);

      // 构建 id→昵称 和 id→相册名 映射
      const memberMap = new Map<string, string>();
      for (const m of allMembers) {
        memberMap.set(m.id, m.nickname);
      }
      const albumMap = new Map<string, string>();
      for (const a of allAlbums) {
        albumMap.set(a.id, a.name);
      }

      // 过滤
      const results = allPhotos.filter((p) => {
        if (uploaderId && p.uploadedBy !== uploaderId) return false;
        if (albumId && p.albumId !== albumId) return false;
        return true;
      });

      // 统计
      const byUploader: Record<string, number> = {};
      const byAlbum: Record<string, number> = {};
      const breakdown: Record<string, Record<string, number>> = {};

      for (const p of results) {
        const nickname = (p.uploadedBy && memberMap.get(p.uploadedBy)) || "未知";
        const album = (p.albumId && albumMap.get(p.albumId)) || "未知";

        byUploader[nickname] = (byUploader[nickname] || 0) + 1;
        byAlbum[album] = (byAlbum[album] || 0) + 1;

        if (!breakdown[nickname]) breakdown[nickname] = {};
        breakdown[nickname][album] = (breakdown[nickname][album] || 0) + 1;
      }

      return {
        data: {
          total: results.length,
          filter: {
            uploaderNickname: uploaderNickname || "全部",
            albumName: albumName || "全部",
          },
          byUploader,
          byAlbum,
          breakdown,
        },
      };
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
