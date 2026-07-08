"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Plus,
  MonitorPlay,
  Clock,
  FileText,
  BookMarked,
  Layers,
  Accessibility,
  BarChart3,
  Settings,
  BookOpen,
  LogOut,
  Sparkles,
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { RouteLoadingOverlay } from "@/components/ui/RouteLoadingOverlay";

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
  const router = useRouter();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    setPendingRoute(null);
  }, [pathname]);

  const handleNavClick = (url: string) => {
    if (url !== pathname) {
      setPendingRoute(url);
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard";
    if (url === "/workspace") return pathname.startsWith("/workspace") || pathname.startsWith("/reviews/");
    return pathname.startsWith(url);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("current_user");
    document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    if (isMobile) {
      setOpenMobile(false);
    }
    router.replace("/auth");
  };

  return (
    <>
    {pendingRoute && <RouteLoadingOverlay label="Opening page" />}
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 border-b border-sidebar-border p-2">
        <div className="flex h-full items-center gap-2 overflow-hidden px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <img src="/logo.png" alt="UXNavigator" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] font-semibold text-sidebar-foreground">UXNavigator</span>
            <span className="truncate text-[11px] leading-tight text-muted-foreground">AI-assisted UX governance</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1 p-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.group} className="p-0">
            <SidebarGroupLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label={group.group}>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      <Link
                        href={item.url}
                        onClick={() => handleNavClick(item.url)}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <nav aria-label="Account">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Documentation" className="text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
              <Link href="/settings" onClick={() => handleNavClick("/settings")}>
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                <span>Documentation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              onClick={handleLogout}
              className="text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        </nav>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    </>
  );
}
