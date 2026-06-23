import { Font } from "@react-pdf/renderer";

const FONT_FAMILY = "Noto Sans SC";
const FONT_URL = "/fonts/NotoSansSC-Regular.otf";

let fontsReady: Promise<void> | null = null;

/** 注册完整中文字体（不子集化），导出前调用一次即可 */
export function ensurePdfFontsRegistered(): Promise<void> {
  if (!fontsReady) {
    fontsReady = registerFonts();
  }
  return fontsReady;
}

async function registerFonts(): Promise<void> {
  const response = await fetch(FONT_URL);
  if (!response.ok) {
    throw new Error("简历字体加载失败，请刷新页面后重试");
  }

  const fontBytes = await response.arrayBuffer();
  const header = new Uint8Array(fontBytes.slice(0, 4));
  const magic = String.fromCharCode(...header);
  if (magic !== "OTTO" && magic !== "\0\x01\0\0") {
    throw new Error("简历字体文件无效，请联系管理员更新字体资源");
  }

  const src = URL.createObjectURL(new Blob([fontBytes]));

  // 同一字体文件同时注册 normal / bold，避免 faux-bold 导致行高计算为 0
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src, fontWeight: "normal", fontStyle: "normal" },
      { src, fontWeight: "bold", fontStyle: "normal" },
    ],
  });
}

export { FONT_FAMILY };
