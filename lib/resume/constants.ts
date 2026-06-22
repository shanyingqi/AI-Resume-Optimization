/** 简历上传允许的扩展名 */
export const ACCEPTED_RESUME_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

/** 单份简历文件大小上限 */
export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** 简历文本字数上限（粘贴 / 解析后） */
export const MAX_RESUME_CHARS = 12_000;

/** 岗位 JD 字数上限 */
export const MAX_JD_CHARS = 6_000;

/** 优化接口：每 IP 每小时最大请求次数 */
export const OPTIMIZE_RATE_LIMIT = 10;

/** 文件解析接口：每 IP 每小时最大请求次数 */
export const PARSE_RATE_LIMIT = 30;

/** 频率限制时间窗口（毫秒） */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** 草稿自动保存的 localStorage 键名 */
export const DRAFT_STORAGE_KEY = "xiaodan-resume-draft";

/** 历史记录的 localStorage 键名 */
export const HISTORY_STORAGE_KEY = "xiaodan-resume-history";

/** 最多保留的历史记录条数 */
export const MAX_HISTORY_RECORDS = 20;
