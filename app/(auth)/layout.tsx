export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RootLayout 的 body 是 flex 布局，这里确保 auth 页面占满并居中
  return (
    <div className="flex min-h-screen w-full flex-1 items-center justify-center">
      {children}
    </div>
  );
}
