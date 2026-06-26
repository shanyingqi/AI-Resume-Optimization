/** 一次性邮箱域名黑名单（常见临时邮箱） */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "throwaway.email",
  "sharklasers.com",
  "trashmail.com",
  "fakeinbox.com",
  "dispostable.com",
  "maildrop.cc",
  "getnada.com",
  "tempail.com",
]);

const EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** @ 前用户名通用最短长度 */
const MIN_LOCAL_PART_LENGTH = 3;

/** 常见邮箱服务商对本地部分的额外规则 */
const DOMAIN_LOCAL_RULES: Array<{
  domains: Set<string>;
  validate: (local: string) => string | null;
}> = [
  {
    domains: new Set(["qq.com", "foxmail.com"]),
    validate(local) {
      if (/^\d+$/.test(local)) {
        if (local.length < 5) return "QQ 邮箱号码至少 5 位数字";
        if (local.length > 11) return "QQ 邮箱号码不能超过 11 位数字";
        return null;
      }
      if (local.length < MIN_LOCAL_PART_LENGTH) {
        return `邮箱 @ 前的用户名至少 ${MIN_LOCAL_PART_LENGTH} 个字符`;
      }
      return null;
    },
  },
  {
    domains: new Set(["163.com", "126.com", "yeah.net"]),
    validate(local) {
      if (local.length < 6) return "网易邮箱用户名至少 6 个字符";
      return null;
    },
  },
];

/** 规范化邮箱：去空格、转小写 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 验证本地部分
function validateLocalPart(local: string, domain: string): string | null {
  if (local.length < MIN_LOCAL_PART_LENGTH) {
    return `邮箱 @ 前的用户名至少 ${MIN_LOCAL_PART_LENGTH} 个字符`;
  }

  for (const rule of DOMAIN_LOCAL_RULES) {
    if (rule.domains.has(domain)) {
      return rule.validate(local);
    }
  }

  return null;
}

/** 校验邮箱格式与规则，通过返回 null，否则返回错误文案 */
export function validateEmail(email: string): string | null {
  const trimmed = normalizeEmail(email);
  if (!trimmed) return "邮箱不能为空";
  if (trimmed.length > 254) return "邮箱过长";
  if (trimmed.includes("..")) return "邮箱格式无效";
  if (!EMAIL_RE.test(trimmed)) return "邮箱格式无效";

  const at = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (local.length > 64) return "邮箱格式无效";
  if (domain.startsWith("-") || domain.endsWith("-")) return "邮箱格式无效";

  const localError = validateLocalPart(local, domain);
  if (localError) return localError;

  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) return "邮箱格式无效";

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "不支持临时邮箱，请使用常用邮箱注册";
  }

  return null;
}
