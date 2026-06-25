"use client";

import AppSidebar from "@/app/components/AppSidebar";
import OnboardingModal from "@/app/components/OnboardingModal";
import { AuthGuard } from "@/app/components/AuthProvider";
import UserMenu from "@/app/components/UserMenu";
import { useState } from "react";

// 主布局
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <AuthGuard>
      <AppSidebar
        externalSettingsOpen={settingsOpen}
        onExternalSettingsOpenChange={setSettingsOpen}
      />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        <OnboardingModal />
        {children}
      </main>
    </AuthGuard>
  );
}
