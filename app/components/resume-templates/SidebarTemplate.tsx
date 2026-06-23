import type { StructuredResume } from "@/lib/types/resume";
import { formatContactLine } from "@/lib/resume/structured-resume";
import { RESUME_TOKENS } from "@/lib/resume/template-tokens";
import ResumeBody from "./ResumeBody";

interface SidebarTemplateProps {
  data: StructuredResume;
}

/** 侧栏风格：左侧深色信息栏 */
export default function SidebarTemplate({ data }: SidebarTemplateProps) {
  const contact = formatContactLine(data.basics);

  return (
    <div
      className="mx-auto flex min-h-[1056px] w-full max-w-[794px] overflow-hidden bg-white text-left shadow-sm"
      style={{
        color: RESUME_TOKENS.colors.primary,
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
      }}
    >
      <aside className="w-[200px] shrink-0 bg-zinc-900 px-5 py-8 text-white">
        <h1 className="text-lg font-bold leading-snug">{data.basics.name}</h1>
        {data.basics.title && (
          <p className="mt-2 text-xs text-zinc-300">{data.basics.title}</p>
        )}
        {contact && (
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">{contact}</p>
        )}
      </aside>
      <main className="min-w-0 flex-1" style={{ padding: RESUME_TOKENS.spacing.pagePadding }}>
        <ResumeBody data={data} />
      </main>
    </div>
  );
}
