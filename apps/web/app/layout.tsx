import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { AppSidebar } from "@/components/ui/AppSidebar";

export const metadata: Metadata = {
  title: "UXNavigator — AI-assisted UX governance",
  description:
    "AI-assisted UX review platform. Triage findings, manage governance checklists, and track UX principles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex min-h-dvh w-full bg-background">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
