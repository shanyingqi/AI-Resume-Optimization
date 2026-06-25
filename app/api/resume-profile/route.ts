import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toResumeProfile } from "@/lib/db/mappers/project";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import { MAX_RESUME_CHARS } from "@/lib/resume/constants";

/** 获取主简历 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const profile = await prisma.resumeProfile.findUnique({
      where: { userId: user.id },
    });
    return jsonResponse({ profile: profile ? toResumeProfile(profile) : null });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 创建或更新主简历 */
export async function PUT(request: Request) {
  try {
    const user = await requireUser(request);
    let body: { title?: string; content?: string };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }

    const content = body.content?.trim();
    if (!content) {
      return errorResponse("简历内容不能为空");
    }
    if (content.length > MAX_RESUME_CHARS) {
      return errorResponse(`简历不能超过 ${MAX_RESUME_CHARS.toLocaleString()} 字`);
    }

    const title = body.title?.trim().slice(0, 80) || "我的主简历";

    const profile = await prisma.resumeProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, title, content },
      update: { title, content },
    });

    await prisma.resumeVersion.create({
      data: {
        userId: user.id,
        title: `${title} · ${new Date().toLocaleDateString("zh-CN")}`,
        content,
        source: "manual",
      },
    });

    return jsonResponse({ profile: toResumeProfile(profile) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
