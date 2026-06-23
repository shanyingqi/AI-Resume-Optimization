import { Text, View } from "@react-pdf/renderer";
import type { StructuredResume } from "@/lib/types/resume";
import { baseStyles } from "./react-pdf-styles";

function SectionTitle({
  children,
  first,
}: {
  children: string;
  first?: boolean;
}) {
  return (
    <Text style={[baseStyles.sectionTitle, ...(first ? [baseStyles.sectionFirst] : [])]}>
      {children}
    </Text>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((point, index) => (
        <View key={index} style={baseStyles.bulletRow}>
          <Text style={baseStyles.bulletMark}>•</Text>
          <Text style={baseStyles.bulletText}>{point}</Text>
        </View>
      ))}
    </View>
  );
}

/** 各 PDF 模板共用的简历正文区块 */
export default function PdfResumeBody({ data }: { data: StructuredResume }) {
  let sectionIndex = 0;

  return (
    <View>
      {data.summary ? (
        <View>
          <SectionTitle first={sectionIndex++ === 0}>个人总结</SectionTitle>
          <Text style={baseStyles.bodyText}>{data.summary}</Text>
        </View>
      ) : null}

      {data.experience.length > 0 ? (
        <View>
          <SectionTitle first={sectionIndex++ === 0}>工作经历</SectionTitle>
          {data.experience.map((item, index) => (
            <View key={`${item.company}-${index}`} style={baseStyles.itemBlock}>
              <View style={baseStyles.itemRow}>
                <Text style={baseStyles.itemTitle}>
                  {item.company}
                  {item.role ? ` · ${item.role}` : ""}
                </Text>
                {item.period ? <Text style={baseStyles.itemMeta}>{item.period}</Text> : null}
              </View>
              {item.highlights.length > 0 ? <BulletList items={item.highlights} /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {data.projects.length > 0 ? (
        <View>
          <SectionTitle first={sectionIndex++ === 0}>项目经历</SectionTitle>
          {data.projects.map((item, index) => (
            <View key={`${item.name}-${index}`} style={baseStyles.itemBlock}>
              <View style={baseStyles.itemRow}>
                <Text style={baseStyles.itemTitle}>{item.name}</Text>
                {item.techStack && item.techStack.length > 0 ? (
                  <Text style={baseStyles.itemMeta}>{item.techStack.join(" / ")}</Text>
                ) : null}
              </View>
              {item.description ? (
                <Text style={[baseStyles.bodyText, { marginTop: 2 }]}>{item.description}</Text>
              ) : null}
              {item.highlights.length > 0 ? <BulletList items={item.highlights} /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {data.education.length > 0 ? (
        <View>
          <SectionTitle first={sectionIndex++ === 0}>教育背景</SectionTitle>
          {data.education.map((item, index) => (
            <View key={`${item.school}-${index}`} style={baseStyles.itemBlock}>
              <View style={baseStyles.itemRow}>
                <Text style={baseStyles.itemTitle}>
                  {item.school}
                  {item.major ? ` · ${item.major}` : ""}
                  {item.degree ? ` · ${item.degree}` : ""}
                </Text>
                {item.period ? <Text style={baseStyles.itemMeta}>{item.period}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {data.skills.length > 0 ? (
        <View>
          <SectionTitle first={sectionIndex++ === 0}>专业技能</SectionTitle>
          {data.skills.map((group, index) => (
            <Text key={index} style={baseStyles.skillLine}>
              {group.category ? `${group.category}：` : ""}
              {group.items.join("、")}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
