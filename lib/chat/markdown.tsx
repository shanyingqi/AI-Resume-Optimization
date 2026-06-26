import type { ReactNode } from "react";

type Segment =
  | { kind: "code"; content: string }
  | { kind: "prose"; content: string };

/** 统一空白与列表符号，避免全角 * 等无法识别 */
function normalizeLine(line: string): string {
  return line
    .trim()
    .replace(/^[\uFF0A\u2217\uFE63\u204E]/, "*")
    .replace(/^\u2022/, "*")
    .replace(/^\u00B7/, "*")
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");
}

/** 解析无序列表行，返回列表项正文；非列表行返回 null */
function parseBulletContent(line: string): string | null {
  const trimmed = normalizeLine(line);
  const match =
    trimmed.match(/^[-*•·]\s+(.+)$/) ?? trimmed.match(/^\*\s*(\*\*.+)$/);
  return match?.[1] ?? null;
}

/** 将全文拆成代码块与普通段落 */
function splitSegments(text: string): Segment[] {
  const lines = text.split("\n");
  const segments: Segment[] = [];
  let proseBuf: string[] = [];
  let codeBuf: string[] = [];
  let inFence = false;

  // 刷新普通段落
  const flushProse = () => {
    if (!proseBuf.length) return;
    segments.push({ kind: "prose", content: proseBuf.join("\n") });
    proseBuf = [];
  };

  // 遍历每一行
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      if (!inFence) {
        flushProse();
        inFence = true;
        codeBuf = [];
      } else {
        segments.push({ kind: "code", content: codeBuf.join("\n") });
        codeBuf = [];
        inFence = false;
      }
      continue;
    }

    if (inFence) {
      codeBuf.push(line);
    } else {
      proseBuf.push(line);
    }
  }

  if (inFence) {
    segments.push({ kind: "code", content: codeBuf.join("\n") });
  } else {
    flushProse();
  }

  return segments;
}

/** 代码块内容是否实为 Markdown 列表/段落（非程序代码） */
function looksLikeProseBlock(content: string): boolean {
  const lines = content
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  if (!lines.length) return false;

  // 只要含列表行，就按 Markdown 渲染（避免「标题 + 列表」被当成代码块）
  if (lines.some((l) => parseBulletContent(l) !== null || /^\d+\.\s+/.test(l))) {
    return true;
  }

  if (lines.some((l) => /^#{1,6}\s/.test(l) || /^>\s/.test(l))) {
    return true;
  }

  const codeLike = lines.filter((l) =>
    /^(import |const |let |var |function |def |class |public |#include|{\s*$|}\s*$)/.test(
      l,
    ),
  );
  return codeLike.length === 0 && lines.length <= 12;
}

/** 行内 Markdown：**粗体**、*斜体*、`代码` */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // ** 优先于 *，避免 * **粗体** 被误解析
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-zinc-200/70 px-1 py-0.5 text-[0.85em] dark:bg-zinc-700/70"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length ? parts : [text];
}

/** 渲染普通 Markdown 段落（不含代码围栏） */
function renderProse(text: string, keyOffset: number): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let listOrdered = false;
  let key = keyOffset;

  // 刷新列表
  const flushList = () => {
    if (!listItems.length) return;
    const ListTag = listOrdered ? "ol" : "ul";
    nodes.push(
      <ListTag
        key={key++}
        className={`my-2 space-y-1 pl-5 ${listOrdered ? "list-decimal" : "list-disc"}`}
      >
        {listItems}
      </ListTag>,
    );
    listItems = [];
    listOrdered = false;
  };

  // 遍历每一行
  for (const line of lines) {
    const trimmed = normalizeLine(line);

    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      nodes.push(
        <hr
          key={key++}
          className="my-3 border-zinc-200 dark:border-zinc-700"
        />,
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = Math.min(headingMatch[1].length + 1, 6);
      const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
      nodes.push(
        <Tag key={key++} className="mt-3 mb-1 font-semibold first:mt-0">
          {renderInline(headingMatch[2] ?? "")}
        </Tag>,
      );
      continue;
    }

    const blockquote = trimmed.match(/^>\s+(.+)$/);
    if (blockquote) {
      flushList();
      nodes.push(
        <blockquote
          key={key++}
          className="my-2 border-l-2 border-zinc-300 pl-3 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
        >
          {renderInline(blockquote[1] ?? "")}
        </blockquote>,
      );
      continue;
    }

    const bulletContent = parseBulletContent(trimmed);
    if (bulletContent !== null) {
      if (listOrdered) flushList();
      listOrdered = false;
      listItems.push(
        <li key={listItems.length}>{renderInline(bulletContent)}</li>,
      );
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (!listOrdered && listItems.length) flushList();
      listOrdered = true;
      listItems.push(
        <li key={listItems.length}>{renderInline(ordered[1] ?? "")}</li>,
      );
      continue;
    }

    flushList();
    nodes.push(
      <p key={key++} className="mb-1 last:mb-0">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return nodes;
}

/** 将助手回复的 Markdown 渲染为可读排版 */
export function MarkdownContent({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const segments = splitSegments(text);
  const nodes: ReactNode[] = [];
  let key = 0;

  for (const segment of segments) {
    if (segment.kind === "code") {
      const content = segment.content.trim();
      if (!content) continue;
      if (looksLikeProseBlock(content)) {
        nodes.push(...renderProse(content, key));
        key += content.split("\n").length + 10;
      } else {
        nodes.push(
          <pre
            key={key++}
            className="my-2 overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap dark:bg-zinc-800/80"
          >
            <code>{content}</code>
          </pre>,
        );
      }
      continue;
    }

    nodes.push(...renderProse(segment.content, key));
    key += segment.content.split("\n").length + 10;
  }

  return <div className={className}>{nodes}</div>;
}
