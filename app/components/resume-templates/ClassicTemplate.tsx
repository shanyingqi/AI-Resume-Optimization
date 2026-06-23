import type { StructuredResume } from "@/lib/types/resume";
import { formatContactLine } from "@/lib/resume/structured-resume";
import { RESUME_TOKENS } from "@/lib/resume/template-tokens";
import ResumeBody from "./ResumeBody";

interface ClassicTemplateProps {
  data: StructuredResume;
}

/** 简约单栏 HTML 简历预览模板 */
export default function ClassicTemplate({ data }: ClassicTemplateProps) {
  const contact = formatContactLine(data.basics);

  return (
    <div
      className="mx-auto min-h-[1056px] w-full max-w-[794px] bg-white text-left shadow-sm"
      style={{
        color: RESUME_TOKENS.colors.primary,
        padding: RESUME_TOKENS.spacing.pagePadding,
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
      }}
    >
      <header className="mb-5 border-b-2 pb-4" style={{ borderColor: RESUME_TOKENS.colors.accent }}>
        <h1 className="text-2xl font-bold tracking-tight">{data.basics.name}</h1>
        {data.basics.title && (
          <p className="mt-1 text-sm" style={{ color: RESUME_TOKENS.colors.muted }}>
            {data.basics.title}
          </p>
        )}
        {contact && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: RESUME_TOKENS.colors.muted }}>
            {contact}
          </p>
        )}
      </header>
      <ResumeBody data={data} />
    </div>
  );
}
