import type {
  ResumeBasics,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
  StructuredResume,
} from "@/lib/types/resume";

const SECTION_HEADERS =
  /^(?:【\s*)?(个人信息|基本信息|联系方式|求职意向|自我评价|个人总结|个人简介|教育背景|教育经历|学历|工作经历|工作经验|实习经历|项目经历|项目经验|专业技能|技能特长|技能|证书荣誉|其他)(?:\s*】)?$/;

/** 将未知值转换为字符串 */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** 将未知值转换为字符串数组 */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

/** 归一化基本信息 */
function normalizeBasics(raw: Partial<ResumeBasics> | undefined): ResumeBasics {
  return {
    name: asString(raw?.name) || "姓名",
    title: asString(raw?.title) || undefined,
    email: asString(raw?.email) || undefined,
    phone: asString(raw?.phone) || undefined,
    location: asString(raw?.location) || undefined,
    links: asStringArray(raw?.links),
  };
}

/** 归一化工作经历 */
function normalizeExperience(raw: unknown): ResumeExperience[] {
  if (!Array.isArray(raw)) return [];
  const items: ResumeExperience[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<ResumeExperience>;
    const company = asString(record.company);
    const role = asString(record.role);
    const highlights = asStringArray(record.highlights);
    if (!company && !role && highlights.length === 0) continue;
    items.push({
      company: company || "公司",
      role: role || "职位",
      period: asString(record.period) || undefined,
      highlights,
    });
  }
  return items;
}

/** 归一化教育经历 */
function normalizeEducation(raw: unknown): ResumeEducation[] {
  if (!Array.isArray(raw)) return [];
  const items: ResumeEducation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<ResumeEducation>;
    const school = asString(record.school);
    if (!school) continue;
    items.push({
      school,
      degree: asString(record.degree) || undefined,
      major: asString(record.major) || undefined,
      period: asString(record.period) || undefined,
    });
  }
  return items;
}

/** 归一化项目经历 */
function normalizeProjects(raw: unknown): ResumeProject[] {
  if (!Array.isArray(raw)) return [];
  const items: ResumeProject[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<ResumeProject>;
    const name = asString(record.name);
    const highlights = asStringArray(record.highlights);
    if (!name && highlights.length === 0) continue;
    items.push({
      name: name || "项目",
      description: asString(record.description) || undefined,
      highlights,
      techStack: asStringArray(record.techStack),
    });
  }
  return items;
}

/** 归一化技能 */
function normalizeSkills(raw: unknown): ResumeSkillGroup[] {
  if (!Array.isArray(raw)) return [];
  const items: ResumeSkillGroup[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<ResumeSkillGroup>;
    const skillItems = asStringArray(record.items);
    if (skillItems.length === 0) continue;
    items.push({
      category: asString(record.category) || undefined,
      items: skillItems,
    });
  }
  return items;
}

/** 检查简历是否包含结构化内容 */
function hasStructuredContent(resume: StructuredResume): boolean {
  return (
    resume.basics.name !== "姓名" ||
    Boolean(resume.basics.title) ||
    Boolean(resume.summary) ||
    resume.experience.length > 0 ||
    resume.education.length > 0 ||
    resume.projects.length > 0 ||
    resume.skills.length > 0
  );
}

/** 从 AI 返回或纯文本中归一化结构化简历（兜底） */
export function normalizeStructuredResume(
  raw: unknown,
  fullText: string,
): StructuredResume | undefined {
  const fromAi =
    raw && typeof raw === "object"
      ? {
          basics: normalizeBasics((raw as Partial<StructuredResume>).basics),
          summary: asString((raw as Partial<StructuredResume>).summary) || undefined,
          experience: normalizeExperience((raw as Partial<StructuredResume>).experience),
          education: normalizeEducation((raw as Partial<StructuredResume>).education),
          projects: normalizeProjects((raw as Partial<StructuredResume>).projects),
          skills: normalizeSkills((raw as Partial<StructuredResume>).skills),
        }
      : null;

  if (fromAi && hasStructuredContent(fromAi)) {
    return fromAi;
  }

  const trimmed = fullText.trim();
  if (!trimmed) return undefined;

  const fromText = parseStructuredFromText(trimmed);
  return hasStructuredContent(fromText) ? fromText : undefined;
}

/** 从优化版纯文本粗解析结构（兜底，供旧历史记录使用） */
export function parseStructuredFromText(text: string): StructuredResume {
  const lines = text.split("\n").map((line) => line.trim());
  const basics: ResumeBasics = { name: "姓名" };
  const experience: ResumeExperience[] = [];
  const education: ResumeEducation[] = [];
  const projects: ResumeProject[] = [];
  const skills: ResumeSkillGroup[] = [];
  let summary = "";

  type SectionKey = "basics" | "summary" | "education" | "experience" | "projects" | "skills" | "other";
  let current: SectionKey = "basics";
  let currentExp: ResumeExperience | null = null;
  let currentProject: ResumeProject | null = null;
  let currentEdu: ResumeEducation | null = null;
  const otherLines: string[] = [];

  const flushExp = () => {
    if (currentExp && (currentExp.company || currentExp.role || currentExp.highlights.length)) {
      experience.push(currentExp);
    }
    currentExp = null;
  };

  const flushProject = () => {
    if (currentProject && (currentProject.name || currentProject.highlights.length)) {
      projects.push(currentProject);
    }
    currentProject = null;
  };

  const flushEdu = () => {
    if (currentEdu?.school) {
      education.push(currentEdu);
    }
    currentEdu = null;
  };

  const mapSection = (header: string): SectionKey => {
    if (/个人信息|基本信息|联系方式|求职意向/.test(header)) return "basics";
    if (/自我评价|个人总结|个人简介/.test(header)) return "summary";
    if (/教育/.test(header)) return "education";
    if (/工作|实习|经历/.test(header) && !/项目/.test(header)) return "experience";
    if (/项目/.test(header)) return "projects";
    if (/技能|专业/.test(header)) return "skills";
    return "other";
  };

  for (const line of lines) {
    if (!line) continue;

    const headerMatch = line.match(SECTION_HEADERS);
    if (headerMatch) {
      flushExp();
      flushProject();
      flushEdu();
      current = mapSection(headerMatch[1]);
      continue;
    }

    const bullet = line.replace(/^[•·\-*]\s*/, "");
    const isBullet = bullet !== line;

    if (current === "basics") {
      if (basics.name === "姓名" && !line.includes("@") && !/^\d{7,}/.test(line) && line.length <= 20) {
        basics.name = line.replace(/^【(.+)】$/, "$1");
        continue;
      }
      if (line.includes("@")) basics.email = line;
      else if (/^1[3-9]\d{9}$/.test(line.replace(/\s/g, "")) || /电话|手机/.test(line)) {
        basics.phone = line.replace(/电话[:：]?\s*|手机[:：]?\s*/g, "");
      } else if (/意向|求职|岗位/.test(line)) basics.title = line.replace(/^求职意向[:：]?\s*/, "");
      else if (!basics.title && line.length <= 30) basics.title = line;
      continue;
    }

    if (current === "summary") {
      summary += (summary ? "\n" : "") + line;
      continue;
    }

    if (current === "education") {
      if (!currentEdu) currentEdu = { school: line };
      else if (!currentEdu.degree && /本科|硕士|博士|专科|学士/.test(line)) currentEdu.degree = line;
      else if (!currentEdu.major) currentEdu.major = line;
      else if (!currentEdu.period) currentEdu.period = line;
      else currentEdu = { school: line };
      continue;
    }

    if (current === "experience") {
      if (isBullet && currentExp) {
        currentExp.highlights.push(bullet);
      } else if (!currentExp || currentExp.highlights.length > 0) {
        flushExp();
        const parts = line.split(/\s{2,}|｜|\|/).map((p) => p.trim()).filter(Boolean);
        currentExp = {
          company: parts[0] ?? line,
          role: parts[1] ?? "",
          period: parts[2],
          highlights: [],
        };
      } else {
        currentExp.role = line;
      }
      continue;
    }

    if (current === "projects") {
      if (isBullet && currentProject) {
        currentProject.highlights.push(bullet);
      } else {
        flushProject();
        currentProject = { name: line, highlights: [] };
      }
      continue;
    }

    if (current === "skills") {
      const items = line.split(/[,，、|｜]/).map((s) => s.trim()).filter(Boolean);
      if (items.length) skills.push({ items });
      continue;
    }

    otherLines.push(line);
  }

  flushExp();
  flushProject();
  flushEdu();

  if (!summary && otherLines.length > 0 && experience.length === 0) {
    basics.name = otherLines[0]?.replace(/^【(.+)】$/, "$1") ?? basics.name;
  }

  return {
    basics,
    summary: summary || undefined,
    experience,
    education,
    projects,
    skills,
  };
}

/** 拼接联系方式用于展示 */
export function formatContactLine(basics: ResumeBasics): string {
  return [basics.phone, basics.email, basics.location, ...(basics.links ?? [])]
    .filter(Boolean)
    .join("  ·  ");
}

/** 从 AI 结构或纯文本解析出可用的结构化简历 */
export function resolveStructuredResume(
  structuredResume: StructuredResume | undefined,
  fullOptimizedResume: string,
): StructuredResume {
  return (
    structuredResume ??
    normalizeStructuredResume(undefined, fullOptimizedResume) ??
    parseStructuredFromText(fullOptimizedResume)
  );
}
