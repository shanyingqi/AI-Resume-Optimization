/** 返回给前端的用户公开字段 */
export const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  onboardingCompleted: true,
  createdAt: true,
} as const;
