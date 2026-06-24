import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toChatSessionSummary } from "@/lib/db/mappers/chat";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import { MAX_CHAT_SESSIONS } from "@/lib/resume/constants";
import type { Prisma } from "@prisma/client";
import type { ChatSession } from "@/lib/types/chat";

/** 获取当前用户的聊天会话列表 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: MAX_CHAT_SESSIONS,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    const sessions = rows
      .filter((s) => s.messages.length > 0)
      .map((s) => toChatSessionSummary(s));

    return jsonResponse({ sessions });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 创建或更新聊天会话（含消息） */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    let body: { session?: ChatSession };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }

    const session = body.session;
    if (!session?.id || !session.title) {
      return errorResponse("缺少必要字段");
    }
    const contextValue = (session.context ?? undefined) as
      | Prisma.InputJsonValue
      | undefined;

    const existing = await prisma.chatSession.findFirst({
      where: { id: session.id, userId: user.id },
    });

    if (existing) {
      await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
      const updated = await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          title: session.title,
          context: contextValue,
          messages: {
            create: session.messages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.createdAt),
              attachments: (msg.attachments ?? undefined) as
                | Prisma.InputJsonValue
                | undefined,
            })),
          },
        },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      return jsonResponse({ session: toChatSessionSummary(updated) });
    }

    const created = await prisma.chatSession.create({
      data: {
        id: session.id,
        userId: user.id,
        title: session.title,
        context: contextValue,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: {
          create: session.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(msg.createdAt),
            attachments: (msg.attachments ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
          })),
        },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    const total = await prisma.chatSession.count({ where: { userId: user.id } });
    if (total > MAX_CHAT_SESSIONS) {
      const overflow = await prisma.chatSession.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "asc" },
        take: total - MAX_CHAT_SESSIONS,
        select: { id: true },
      });
      if (overflow.length > 0) {
        await prisma.chatSession.deleteMany({
          where: { id: { in: overflow.map((s) => s.id) } },
        });
      }
    }

    return jsonResponse({ session: toChatSessionSummary(created) }, 201);
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
