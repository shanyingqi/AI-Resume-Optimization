/** 简历上传允许的扩展名 */
export const ACCEPTED_RESUME_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

/** 单份简历文件大小上限 */
export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** 草稿自动保存的 localStorage 键名 */
export const DRAFT_STORAGE_KEY = "xiaodan-resume-draft";

/** 历史记录的 localStorage 键名 */
export const HISTORY_STORAGE_KEY = "xiaodan-resume-history";

/** 最多保留的历史记录条数 */
export const MAX_HISTORY_RECORDS = 20;
