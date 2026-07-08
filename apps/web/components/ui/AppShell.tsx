"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/ui/AppSidebar";
import { SkipLink } from "@/components/ui/SkipLink";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !(pathname === "/auth" || pathname.startsWith("/auth/"));

  if (!showSidebar) {
    return (
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <SkipLink />
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
