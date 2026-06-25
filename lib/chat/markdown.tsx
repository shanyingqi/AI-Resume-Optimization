import type { ReactNode } from "react";

/** 行内 Markdown：**粗体**、*斜体*、`代码` */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
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

/** 将助手回复的 Markdown 渲染为可读排版 */
export function MarkdownContent({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let listOrdered = false;
  let key = 0;

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

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
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

    const blockquote = trimmed.match(/^>\s*(.+)$/);
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

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (listOrdered) flushList();
      listOrdered = false;
      listItems.push(<li key={listItems.length}>{renderInline(bullet[1] ?? "")}</li>);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (!listOrdered && listItems.length) flushList();
      listOrdered = true;
      listItems.push(<li key={listItems.length}>{renderInline(ordered[1] ?? "")}</li>);
      continue;
    }

    flushList();
    nodes.push(
      <p key={key++} className="mb-1 last:mb-0">
        {renderInline(line)}
      </p>,
    );
  }

  flushList();

  return <div className={className}>{nodes}</div>;
}
