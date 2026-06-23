import type { StructuredResume } from "@/lib/types/resume";
import { formatContactLine } from "@/lib/resume/structured-resume";
import { RESUME_TOKENS } from "@/lib/resume/template-tokens";
import ResumeBody from "./ResumeBody";

interface ModernTemplateProps {
  data: StructuredResume;
}

/** 现代风格：绿色顶栏 */
export default function ModernTemplate({ data }: ModernTemplateProps) {
  const contact = formatContactLine(data.basics);

  return (
    <div
      className="mx-auto min-h-[1056px] w-full max-w-[794px] overflow-hidden bg-white text-left shadow-sm"
      style={{
        color: RESUME_TOKENS.colors.primary,
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
      }}
    >
      <header className="bg-emerald-600 px-10 py-6 text-white">
        <h1 className="text-2xl font-bold tracking-tight">{data.basics.name}</h1>
        {data.basics.title && <p className="mt-1 text-sm text-emerald-50">{data.basics.title}</p>}
        {contact && <p className="mt-2 text-xs text-emerald-100">{contact}</p>}
      </header>
      <div style={{ padding: RESUME_TOKENS.spacing.pagePadding }}>
        <ResumeBody data={data} />
      </div>
    </div>
  );
}
