import { Bell, LogOut, Search, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        <UserMenu user={user} />
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: { initials: string; name: string } }) {
  const navigate = useNavigate();
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu, signed in as ${user.name}`}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar className="h-9 w-9 ring-2 ring-border">
            <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">Signed in</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
          <User className="mr-2 h-4 w-4" aria-hidden="true" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
