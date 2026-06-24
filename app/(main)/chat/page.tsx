import { redirect } from "next/navigation";

/** 兼容旧链接：/chat 重定向到首页新对话 */
export default function ChatPage() {
  redirect("/");
}
