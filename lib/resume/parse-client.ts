import { MAX_RESUME_FILE_SIZE } from "@/lib/resume/constants";

/** 解析上传的简历文件为纯文本 */
export async function parseResumeFile(
  file: File,
): Promise<{ text: string; fileName: string }> {
  if (file.size > MAX_RESUME_FILE_SIZE) {
    throw new Error("文件大小不能超过 5MB");
  }

  const name = file.name.toLowerCase();
  const isText = name.endsWith(".txt") || name.endsWith(".md");

  if (isText) {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error("文件内容为空");
    }
    return { text: text.trim(), fileName: file.name };
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/parse-resume", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as { error?: string; text?: string; fileName?: string };

  if (!res.ok) {
    throw new Error(data.error ?? "解析失败");
  }

  if (!data.text?.trim()) {
    throw new Error("未能从文件中提取到文字");
  }

  return { text: data.text.trim(), fileName: data.fileName ?? file.name };
}

/** 从文件名生成主简历标题 */
export function resumeTitleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return base.slice(0, 80) || "我的主简历";
}
