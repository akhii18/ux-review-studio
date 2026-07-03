"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Clock3, FileCheck2, Save, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addNotification, clearNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/store/slices/notificationsSlice";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function iconForNotification(type: AppNotification["type"]) {
  switch (type) {
    case "review_started":
      return Sparkles;
    case "review_completed":
    case "report_exported":
      return FileCheck2;
    case "review_failed":
      return TriangleAlert;
    case "draft_saved":
      return Save;
    default:
      return Bell;
  }
}

function accentForNotification(type: AppNotification["type"]) {
  switch (type) {
    case "review_completed":
    case "report_exported":
      return "text-success bg-success/10";
    case "review_failed":
      return "text-destructive bg-destructive/10";
    case "review_started":
      return "text-primary bg-primary/10";
    default:
      return "text-muted-foreground bg-muted";
  }
}

export function NotificationBellMenu() {
  const dispatch = useAppDispatch();
  const [hasMounted, setHasMounted] = useState(false);
  const [hoveredNotificationId, setHoveredNotificationId] = useState<string | null>(null);
  const notifications = useAppSelector((state) => state.notifications.items);
  const storedUnreadCount = notifications.filter((item) => !item.read).length;
  const unreadCount = hasMounted ? storedUnreadCount : 0;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative h-11 w-11"
        >
          <Bell className="h-4 w-4" aria-hidden />
          <span
            className={cn(
              "absolute right-2 top-2 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white",
              unreadCount === 0 && "hidden",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              disabled={unreadCount === 0}
              onClick={() => dispatch(markAllNotificationsRead())}
            >
              Mark all read
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              disabled={notifications.length === 0}
              onClick={() => dispatch(clearNotifications())}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="max-h-[28rem] overflow-y-auto p-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review updates, exports, and draft saves will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconForNotification(notification.type);
              const iconClassName = accentForNotification(notification.type);
              const isHighlighted = hoveredNotificationId === notification.id;

              const content = (
                <div
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                    isHighlighted && "border-blue-400 bg-blue-50 shadow-sm ring-1 ring-blue-300",
                  )}
                >
                  <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconClassName)}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("truncate text-sm font-medium", !notification.read && "text-foreground")}>{notification.title}</p>
                      {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
                  </div>
                </div>
              );

              if (notification.href) {
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    asChild
                    className="rounded-md p-0 data-[highlighted]:bg-transparent data-[highlighted]:text-popover-foreground focus:bg-transparent focus:text-popover-foreground"
                  >
                    <Link
                      href={notification.href}
                      className="w-full"
                      onMouseEnter={() => setHoveredNotificationId(notification.id)}
                      onMouseLeave={() => setHoveredNotificationId(null)}
                      onFocus={() => setHoveredNotificationId(notification.id)}
                      onBlur={() => setHoveredNotificationId(null)}
                      onClick={() => dispatch(markNotificationRead(notification.id))}
                    >
                      {content}
                    </Link>
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="rounded-md p-0 data-[highlighted]:bg-transparent data-[highlighted]:text-popover-foreground focus:bg-transparent focus:text-popover-foreground"
                  onMouseEnter={() => setHoveredNotificationId(notification.id)}
                  onMouseLeave={() => setHoveredNotificationId(null)}
                  onFocus={() => setHoveredNotificationId(notification.id)}
                  onBlur={() => setHoveredNotificationId(null)}
                  onSelect={() => dispatch(markNotificationRead(notification.id))}
                >
                  {content}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}