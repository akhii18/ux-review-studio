"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Plus, MonitorPlay, Clock, FileText,
  BookMarked, Layers, Accessibility, BarChart3, Settings,
  BookOpen, ListChecks, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    group: "Workspace",
    items: [
      { title: "Dashboard",        url: "/dashboard",      icon: LayoutDashboard },
      { title: "New Review",       url: "/new-review",     icon: Plus },
      { title: "Review Workspace", url: "/workspace",      icon: MonitorPlay },
      { title: "Review History",   url: "/history",        icon: Clock },
      { title: "Reports",          url: "/reports",        icon: FileText },
    ],
  },
  {
    group: "Governance",
    items: [
      { title: "Prompt Library",       url: "/prompts",       icon: Sparkles },
      { title: "UX Principles",        url: "/principles",    icon: BookMarked },
      { title: "Design System Rules",  url: "/design-system", icon: Layers },
      { title: "Accessibility Checks", url: "/accessibility", icon: Accessibility },
    ],
  },
  {
    group: "Insights",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Settings",  url: "/settings",  icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard";
    if (url === "/workspace") return pathname.startsWith("/workspace") || pathname.startsWith("/reviews/");
    return pathname.startsWith(url);
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <img src="/logo.png" alt="UXNavigator" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold text-sidebar-foreground">UXNavigator</span>
          <span className="text-[11px] text-sidebar-foreground/60 leading-tight">AI-assisted UX governance</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navGroups.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.url}>
                  <Link
                    href={item.url}
                    className={cn(
                      "flex min-h-[36px] items-center gap-3 rounded-md px-2 text-sm transition-colors",
                      isActive(item.url)
                        ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        <Link
          href="/settings"
          className="flex min-h-[36px] items-center gap-3 rounded-md px-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
          Documentation
        </Link>
      </div>
    </aside>
  );
}
