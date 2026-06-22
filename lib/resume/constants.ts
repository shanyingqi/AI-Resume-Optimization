export const ACCEPTED_RESUME_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
} as const;

export const ACCEPTED_RESUME_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const DRAFT_STORAGE_KEY = "xiaodan-resume-draft";
export const HISTORY_STORAGE_KEY = "xiaodan-resume-history";
export const MAX_HISTORY_RECORDS = 20;
