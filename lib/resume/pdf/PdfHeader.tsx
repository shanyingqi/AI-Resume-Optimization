import { Text, View, type Styles } from "@react-pdf/renderer";
import type { ReactNode } from "react";

/** 头部单行文本：用 View 包裹，避免 react-pdf 中 Text 的 margin 失效 */
export function PdfHeaderLine({
  children,
  style,
  gap = 8,
}: {
  children: string;
  style: Styles[string];
  gap?: number;
}) {
  return (
    <View style={{ marginBottom: gap, paddingBottom: 1 }}>
      <Text style={style}>{children}</Text>
    </View>
  );
}

/** 头部纵向栈容器 */
export function PdfHeaderStack({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "column" }}>{children}</View>;
}
