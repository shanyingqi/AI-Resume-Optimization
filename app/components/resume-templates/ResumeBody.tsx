import type { StructuredResume } from "@/lib/types/resume";
import { RESUME_TOKENS } from "@/lib/resume/template-tokens";

/** 简历标题 */
function SectionTitle({ children }: { children: string }) {
  return (
    <h3
      className="mb-2 border-b pb-1 text-xs font-bold tracking-wide uppercase"
      style={{ borderColor: RESUME_TOKENS.colors.border, color: RESUME_TOKENS.colors.accent }}
    >
      {children}
    </h3>
  );
}

/** 简历正文区块（各模板共用） */
export default function ResumeBody({ data }: { data: StructuredResume }) {
  return (
    <>
      {data.summary && (
        <section className="mb-4">
          <SectionTitle>个人总结</SectionTitle>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.summary}</p>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="mb-4">
          <SectionTitle>工作经历</SectionTitle>
          <ul className="space-y-3">
            {data.experience.map((item, index) => (
              <li key={`${item.company}-${index}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {item.company}
                    {item.role ? ` · ${item.role}` : ""}
                  </p>
                  {item.period && (
                    <span className="text-xs" style={{ color: RESUME_TOKENS.colors.muted }}>
                      {item.period}
                    </span>
                  )}
                </div>
                {item.highlights.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm leading-relaxed">
                    {item.highlights.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.projects.length > 0 && (
        <section className="mb-4">
          <SectionTitle>项目经历</SectionTitle>
          <ul className="space-y-3">
            {data.projects.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{item.name}</p>
                  {item.techStack && item.techStack.length > 0 && (
                    <span className="text-xs" style={{ color: RESUME_TOKENS.colors.muted }}>
                      {item.techStack.join(" / ")}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-0.5 text-sm leading-relaxed">{item.description}</p>
                )}
                {item.highlights.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm leading-relaxed">
                    {item.highlights.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.education.length > 0 && (
        <section className="mb-4">
          <SectionTitle>教育背景</SectionTitle>
          <ul className="space-y-2">
            {data.education.map((item, index) => (
              <li key={`${item.school}-${index}`} className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium">
                  {item.school}
                  {item.major ? ` · ${item.major}` : ""}
                  {item.degree ? ` · ${item.degree}` : ""}
                </span>
                {item.period && (
                  <span className="text-xs" style={{ color: RESUME_TOKENS.colors.muted }}>
                    {item.period}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.skills.length > 0 && (
        <section>
          <SectionTitle>专业技能</SectionTitle>
          <ul className="space-y-1 text-sm leading-relaxed">
            {data.skills.map((group, index) => (
              <li key={index}>
                {group.category ? (
                  <span className="font-medium">{group.category}：</span>
                ) : null}
                {group.items.join("、")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
