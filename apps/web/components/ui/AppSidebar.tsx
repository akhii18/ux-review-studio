"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Plus, MonitorPlay, Clock, FileText,
  BookMarked, Layers, Accessibility, BarChart3, Settings,
  BookOpen, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

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
  const { setOpenMobile, isMobile } = useSidebar();

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard";
    if (url === "/workspace")
      return pathname.startsWith("/workspace") || pathname.startsWith("/reviews/");
    return pathname.startsWith(url);
  };

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar>
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-16 items-center gap-3 px-4">
          <img
            src="/logo.png"
            alt="UXNavigator"
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 object-contain"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-sidebar-foreground">
              UXNavigator
            </span>
            <span className="text-[11px] text-sidebar-foreground/60 leading-tight">
              AI-assisted UX governance
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      onClick={handleNavClick}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild onClick={handleNavClick}>
              <Link href="/settings">
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                <span>Documentation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
