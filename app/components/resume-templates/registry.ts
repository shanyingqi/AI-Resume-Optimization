import type { ComponentType } from "react";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";
import ClassicTemplate from "./ClassicTemplate";
import ModernTemplate from "./ModernTemplate";
import SidebarTemplate from "./SidebarTemplate";

export interface ResumeTemplateMeta {
  id: ResumeTemplateId;
  name: string;
  description: string;
}

export const RESUME_TEMPLATES: ResumeTemplateMeta[] = [
  {
    id: "classic",
    name: "简约单栏",
    description: "清晰分区、适合大多数岗位",
  },
  {
    id: "modern",
    name: "现代顶栏",
    description: "绿色标题栏，视觉更醒目",
  },
  {
    id: "sidebar",
    name: "侧栏布局",
    description: "左侧信息栏，适合经历较多",
  },
];

const TEMPLATE_COMPONENTS: Record<
  ResumeTemplateId,
  ComponentType<{ data: StructuredResume }>
> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  sidebar: SidebarTemplate,
};

export function getResumeTemplateComponent(id: ResumeTemplateId) {
  return TEMPLATE_COMPONENTS[id];
}
