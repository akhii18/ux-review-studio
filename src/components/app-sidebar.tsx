import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Plus, MonitorPlay, FileBarChart, History, BookMarked,
  Sparkles, Component, Accessibility, BarChart3, Settings, HelpCircle, BookOpen,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const workspace = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "New Review", url: "/new-review", icon: Plus },
  { title: "Review Workspace", url: "/workspace", icon: MonitorPlay },
  { title: "Review History", url: "/history", icon: History },
  { title: "Reports", url: "/reports", icon: FileBarChart },
];

const governance = [
  { title: "Prompt Library", url: "/prompts", icon: Sparkles },
  { title: "UX Principles", url: "/principles", icon: BookMarked },
  { title: "Design System Rules", url: "/design-system", icon: Component },
  { title: "Accessibility Checks", url: "/accessibility", icon: Accessibility },
];

const insights = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const renderGroup = (label: string, items: typeof workspace) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url} className="flex min-h-[36px] items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={`flex items-center gap-3 py-3 ${collapsed ? "justify-center px-0" : "px-2"}`}>
          <img src={logo} alt="UXNavigator" width={64} height={64} className={`${collapsed ? "h-9 w-9" : "h-14 w-14"} shrink-0 object-contain`} />
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-[13px] font-semibold text-sidebar-foreground">UXNavigator</span>
              <span className="text-[11px] leading-tight text-sidebar-foreground/60">AI-assisted UX governance</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {renderGroup("Workspace", workspace)}
        {renderGroup("Governance", governance)}
        {renderGroup("Insights", insights)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Documentation">
              <a
                href="https://docs.lovable.dev"
                target="_blank"
                rel="noreferrer noopener"
                className="flex min-h-[36px] items-center gap-3"
                aria-label="Documentation (opens in a new tab)"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {!collapsed && <span className="text-sm">Documentation</span>}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help & Support">
              <Link to="/settings" className="flex min-h-[36px] items-center gap-3">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                {!collapsed && <span className="text-sm">Help & Support</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
