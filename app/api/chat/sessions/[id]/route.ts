import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toChatSession } from "@/lib/db/mappers/chat";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import type { Prisma } from "@prisma/client";
import type { ChatSession } from "@/lib/types/chat";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 获取单个聊天会话详情 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    const row = await prisma.chatSession.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!row || row.messages.length === 0) {
      return errorResponse("会话不存在", 404);
    }

    return jsonResponse({ session: toChatSession(row) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 更新聊天会话（含消息全量替换） */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    let body: { session?: ChatSession };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }

    const session = body.session;
    if (!session || session.id !== id) {
      return errorResponse("会话数据无效");
    }
    const contextValue = (session.context ?? undefined) as
      | Prisma.InputJsonValue
      | undefined;

    const existing = await prisma.chatSession.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return errorResponse("会话不存在", 404);
    }

    await prisma.chatMessage.deleteMany({ where: { sessionId: id } });

    const updated = await prisma.chatSession.update({
      where: { id },
      data: {
        title: session.title,
        context: contextValue,
        historyId: session.historyId ?? null,
        projectId: session.projectId ?? null,
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

    return jsonResponse({ session: toChatSession(updated) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 删除聊天会话 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    const existing = await prisma.chatSession.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return errorResponse("会话不存在", 404);
    }

    await prisma.chatSession.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
