import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { AppShell } from "@/components/ui/AppShell";

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
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
