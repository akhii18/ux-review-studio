import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppHeader({
  title,
  subtitle,
  notificationCount = 3,
  user = { initials: "RS", name: "Rakhee Sharma" },
}: {
  title: string;
  subtitle?: string;
  notificationCount?: number;
  user?: { initials: string; name: string };
}) {
  return (
    <header
      className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md md:px-6"
    >
      <SidebarTrigger className="-ml-1 h-11 w-11" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex min-w-0 flex-col leading-tight">
        <h1 className="truncate text-base font-semibold text-foreground md:text-[17px]">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground md:text-[13px]">{subtitle}</p>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <form
          role="search"
          className="relative hidden md:block"
          onSubmit={(e) => e.preventDefault()}
        >
          <label htmlFor="global-search" className="sr-only">
            Search reviews, screens, and principles
          </label>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="global-search"
            type="search"
            placeholder="Search reviews, screens, principles…"
            className="h-10 w-72 pl-8 text-sm"
          />
        </form>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            notificationCount > 0
              ? `Notifications, ${notificationCount} unread`
              : "Notifications"
          }
          className="relative h-11 w-11"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {notificationCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive"
            />
          )}
        </Button>
        <Avatar className="h-9 w-9 ring-2 ring-border" aria-label={`Signed in as ${user.name}`}>
          <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
            {user.initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
