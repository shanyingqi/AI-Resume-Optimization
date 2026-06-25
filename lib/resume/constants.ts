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

/** 求职信接口：每 IP 每小时最大请求次数 */
export const COVER_LETTER_RATE_LIMIT = 10;

/** 频率限制时间窗口（毫秒） */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** 草稿自动保存的 localStorage 键名 */
export const DRAFT_STORAGE_KEY = "xiaodan-resume-draft";

/** 历史记录的 localStorage 键名 */
export const HISTORY_STORAGE_KEY = "xiaodan-resume-history";

/** 最多保留的历史记录条数（软删除不计入展示上限） */
export const MAX_HISTORY_RECORDS = 50;

/** 用户每月优化次数上限 */
export const MONTHLY_OPTIMIZE_LIMIT = 30;

/** 用户每月对话请求上限 */
export const MONTHLY_CHAT_LIMIT = 100;

/** 用户每月文件解析上限 */
export const MONTHLY_PARSE_LIMIT = 60;

/** 用户每月求职信生成上限 */
export const MONTHLY_COVER_LETTER_LIMIT = 20;

/** 聊天会话 localStorage 键名 */
export const CHAT_STORAGE_KEY = "xiaodan-chat-sessions";

/** 最多保留的聊天会话数 */
export const MAX_CHAT_SESSIONS = 30;

/** 单条聊天消息字数上限 */
export const MAX_CHAT_MESSAGE_CHARS = 4_000;

/** 单个会话最多消息条数 */
export const MAX_CHAT_MESSAGES = 50;

/** 聊天接口：每 IP 每小时最大请求次数 */
export const CHAT_RATE_LIMIT = 30;

/** 从简历优化页带入对话的上下文（sessionStorage，兼容旧流程） */
export const DRAFT_CHAT_CONTEXT_KEY = "xiaodan-chat-draft-context";

/** 从其他页面跳转优化的草稿参数 */
export const DRAFT_OPTIMIZE_KEY = "xiaodan-optimize-draft";

/** 聊天图片允许的 MIME 类型 */
export const ACCEPTED_CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** 聊天附件允许的扩展名 */
export const ACCEPTED_CHAT_FILE_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

/** 单张聊天图片大小上限 */
export const MAX_CHAT_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

/** 单条消息最多附件数 */
export const MAX_CHAT_ATTACHMENTS = 5;
