"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, Clock3, FileCheck2, Save, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RouteLoadingOverlay } from "@/components/ui/RouteLoadingOverlay";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/store/slices/notificationsSlice";
import { getReview } from "@/lib/api";
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
    case "review_resumed":
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
  const pathname = usePathname();
  const router = useRouter();
  const notifications = useAppSelector((state) => state.notifications.items);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleNotificationOpen = async (notification: AppNotification) => {
    setIsNavigating(true);
    dispatch(markNotificationRead(notification.id));

    if (!notification.reviewId) {
      if (notification.href) {
        router.push(notification.href);
      }
      return;
    }

    const fallbackHref = notification.type === "draft_saved"
      ? `/new-review?reviewId=${notification.reviewId}`
      : `/workspace?reviewId=${notification.reviewId}`;

    try {
      const review = await getReview(notification.reviewId);
      const status = String(review?.status ?? "").toLowerCase();
      const targetHref = notification.type === "draft_saved" && status === "draft"
        ? `/new-review?reviewId=${notification.reviewId}`
        : status === "draft" || status === "in_progress"
          ? `/new-review?reviewId=${notification.reviewId}`
          : `/workspace?reviewId=${notification.reviewId}`;

      router.push(targetHref);
    } catch {
      setIsNavigating(false);
      router.push(fallbackHref);
    }
  };

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
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
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

              const content = (
                <div className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left">
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

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="p-0 rounded-lg transition-all data-[highlighted]:bg-sky-500/10 data-[highlighted]:text-sky-950 data-[highlighted]:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.7)] dark:data-[highlighted]:text-sky-50"
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleNotificationOpen(notification);
                  }}
                >
                  {content}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
      {isNavigating && typeof document !== "undefined"
        ? createPortal(<RouteLoadingOverlay label="Opening review" />, document.body)
        : null}
    </DropdownMenu>
  );
}