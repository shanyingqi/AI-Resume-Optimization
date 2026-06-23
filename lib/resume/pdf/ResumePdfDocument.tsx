import { Document, Page, View } from "@react-pdf/renderer";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";
import { formatContactLine } from "@/lib/resume/structured-resume";
import PdfResumeBody from "./PdfResumeBody";
import { PdfHeaderLine, PdfHeaderStack } from "./PdfHeader";
import { baseStyles, classicStyles, modernStyles, sidebarStyles } from "./react-pdf-styles";

interface ResumePdfDocumentProps {
  data: StructuredResume;
  templateId: ResumeTemplateId;
}

function ClassicPdfPage({ data }: { data: StructuredResume }) {
  const contact = formatContactLine(data.basics);

  return (
    <Page size="A4" style={baseStyles.page}>
      <View style={classicStyles.header}>
        <PdfHeaderStack>
          <PdfHeaderLine style={baseStyles.name} gap={6}>
            {data.basics.name}
          </PdfHeaderLine>
          {data.basics.title ? (
            <PdfHeaderLine style={baseStyles.subtitle} gap={6}>
              {data.basics.title}
            </PdfHeaderLine>
          ) : null}
          {contact ? (
            <PdfHeaderLine style={baseStyles.contact} gap={0}>
              {contact}
            </PdfHeaderLine>
          ) : null}
        </PdfHeaderStack>
      </View>
      <PdfResumeBody data={data} />
    </Page>
  );
}

function ModernPdfPage({ data }: { data: StructuredResume }) {
  const contact = formatContactLine(data.basics);

  return (
    <Page size="A4" style={[baseStyles.page, modernStyles.page]}>
      <View style={modernStyles.header}>
        <PdfHeaderStack>
          <PdfHeaderLine style={modernStyles.headerName} gap={8}>
            {data.basics.name}
          </PdfHeaderLine>
          {data.basics.title ? (
            <PdfHeaderLine style={modernStyles.headerSubtitle} gap={8}>
              {data.basics.title}
            </PdfHeaderLine>
          ) : null}
          {contact ? (
            <PdfHeaderLine style={modernStyles.headerContact} gap={0}>
              {contact}
            </PdfHeaderLine>
          ) : null}
        </PdfHeaderStack>
      </View>
      <View style={modernStyles.body}>
        <PdfResumeBody data={data} />
      </View>
    </Page>
  );
}

function SidebarPdfPage({ data }: { data: StructuredResume }) {
  const contact = formatContactLine(data.basics);

  return (
    <Page size="A4" style={[baseStyles.page, sidebarStyles.page]}>
      <View fixed style={sidebarStyles.sidebar}>
        <PdfHeaderStack>
          <PdfHeaderLine style={sidebarStyles.sidebarName} gap={8}>
            {data.basics.name}
          </PdfHeaderLine>
          {data.basics.title ? (
            <PdfHeaderLine style={sidebarStyles.sidebarSubtitle} gap={10}>
              {data.basics.title}
            </PdfHeaderLine>
          ) : null}
          {contact ? (
            <PdfHeaderLine style={sidebarStyles.sidebarContact} gap={0}>
              {contact}
            </PdfHeaderLine>
          ) : null}
        </PdfHeaderStack>
      </View>
      <View style={sidebarStyles.main}>
        <PdfResumeBody data={data} />
      </View>
    </Page>
  );
}

/** 按模板 ID 渲染对应 PDF 文档 */
export default function ResumePdfDocument({ data, templateId }: ResumePdfDocumentProps) {
  return (
    <Document>
      {templateId === "modern" ? (
        <ModernPdfPage data={data} />
      ) : templateId === "sidebar" ? (
        <SidebarPdfPage data={data} />
      ) : (
        <ClassicPdfPage data={data} />
      )}
    </Document>
  );
}
