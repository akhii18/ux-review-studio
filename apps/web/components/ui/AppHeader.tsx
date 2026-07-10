"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBellMenu } from "@/components/ui/NotificationBellMenu";

type HeaderUser = { initials: string; name: string; email?: string };

function getInitialsFromName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";

  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase() || "U";
}

export function AppHeader({
  title,
  subtitle,
  user = { initials: "U", name: "User" },
}: {
  title: string;
  subtitle?: string;
  user?: HeaderUser;
}) {
  const router = useRouter();
  const [storedUser, setStoredUser] = useState<HeaderUser | null>(null);

  const syncStoredUser = () => {
    const raw = localStorage.getItem("current_user");
    if (!raw) {
      setStoredUser(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { name?: string; email?: string };
      const name = (parsed.name ?? "User").trim() || "User";
      setStoredUser({
        name,
        email: parsed.email,
        initials: getInitialsFromName(name),
      });
    } catch {
      setStoredUser({ initials: "U", name: "User" });
    }
  };

  useEffect(() => {
    syncStoredUser();

    const handleStorage = () => syncStoredUser();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("uxm:user-updated", handleStorage as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("uxm:user-updated", handleStorage as EventListener);
    };
  }, []);

  const activeUser = useMemo(() => {
    if (storedUser) return storedUser;
    return {
      ...user,
      initials: getInitialsFromName(user.name),
    };
  }, [storedUser, user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("current_user");
    document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    router.replace("/auth");
  };

  const handleProfile = () => {
    router.push("/settings");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-headerBg px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1 h-11 w-11" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex min-w-0 flex-col leading-tight">
        <h1 className="truncate text-sm font-semibold text-foreground sm:text-base md:text-[17px]">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground md:text-[13px]">{subtitle}</p>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <form role="search" className="relative hidden md:block" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="global-search" className="sr-only">Search reviews, screens, and principles</label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="global-search"
            type="search"
            placeholder="Search reviews, screens, principles…"
            className="h-11 w-72 pl-8 text-sm"
            disabled
            aria-disabled="true"
            aria-describedby="global-search-help"
          />
          <p id="global-search-help" className="sr-only">
            Global search is coming soon. Use Review History to find past reviews.
          </p>
        </form>
        <NotificationBellMenu />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={`Signed in as ${activeUser.name}`}
            >
              <Avatar className="h-9 w-9 ring-2 ring-border sm:h-10 sm:w-10">
                <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
                  {activeUser.initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleProfile}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" aria-hidden />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
