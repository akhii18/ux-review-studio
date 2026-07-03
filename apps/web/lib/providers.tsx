"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { hydrateNotifications, loadStoredNotifications } from "@/store/slices/notificationsSlice";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(hydrateNotifications(loadStoredNotifications()));
  }, []);

  return (
    <Provider store={store}>
      <SidebarProvider>
        {children}
        <Toaster />
      </SidebarProvider>
    </Provider>
  );
}
