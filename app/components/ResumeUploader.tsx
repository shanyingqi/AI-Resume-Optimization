"use client";

import { useRef, useState } from "react";
import {
  ACCEPTED_RESUME_EXTENSIONS,
  MAX_RESUME_FILE_SIZE,
} from "@/lib/resume/constants";

interface ResumeUploaderProps {
  onParsed: (text: string, fileName: string) => void;
  disabled?: boolean;
}

export default function ResumeUploader({
  onParsed,
  disabled,
}: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [lastFile, setLastFile] = useState("");

  async function handleFile(file: File) {
    setError("");
    setLastFile("");

    if (file.size > MAX_RESUME_FILE_SIZE) {
      setError("文件大小不能超过 5MB");
      return;
    }

    const name = file.name.toLowerCase();
    const isText = name.endsWith(".txt") || name.endsWith(".md");

    setParsing(true);
    try {
      if (isText) {
        const text = await file.text();
        if (!text.trim()) {
          throw new Error("文件内容为空");
        }
        setLastFile(file.name);
        onParsed(text.trim(), file.name);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "解析失败");
      }

      setLastFile(data.fileName);
      onParsed(data.text, data.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled || parsing) return;

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const accept = ACCEPTED_RESUME_EXTENSIONS.join(",");

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !parsing) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !parsing && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragging
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-zinc-300 hover:border-emerald-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        } ${disabled || parsing ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || parsing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {parsing ? (
          <>
            <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              正在解析简历...
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">拖拽文件到此处，或点击上传</p>
            <p className="mt-1 text-xs text-zinc-500">
              支持 PDF、DOCX、TXT、MD，最大 5MB
            </p>
          </>
        )}
      </div>

      {lastFile && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          已加载：{lastFile}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
