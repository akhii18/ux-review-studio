"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NotificationBootstrap } from "@/components/ui/NotificationBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SidebarProvider>
        <NotificationBootstrap />
        {children}
        <Toaster />
      </SidebarProvider>
    </Provider>
  );
}
