import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { AppSidebar } from "@/components/ui/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "UXNavigator — AI-assisted UX governance",
  description:
    "AI-assisted UX review platform. Triage findings, manage governance checklists, and track UX principles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main
                id="main-content"
                tabIndex={-1}
                className="flex flex-1 flex-col focus:outline-none"
              >
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
