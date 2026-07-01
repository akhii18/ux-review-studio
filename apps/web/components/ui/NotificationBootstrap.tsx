"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { clearNotifications, getNotificationsStorageKey, setNotifications, type AppNotification } from "@/store/slices/notificationsSlice";
import { createNotification, listNotifications } from "@/lib/api";

function normalizeNotification(notification: any): AppNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
    read: Boolean(notification.readAt ?? notification.read),
    href: notification.href ?? undefined,
    reviewId: notification.reviewId ?? undefined,
    dedupeKey: notification.dedupeKey ?? undefined,
  };
}

function readNotificationsFromStorage(storageKey: string): AppNotification[] {
  if (typeof window === "undefined") return [];

  const legacyRaw = storageKey === "uxm:notif-items" ? null : window.localStorage.getItem("uxm:notif-items");
  const raw = window.localStorage.getItem(storageKey) ?? legacyRaw;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.type === "string" && item.type !== "review_resumed")
      .map(normalizeNotification);
  } catch {
    return [];
  }
}

async function hydrateNotifications(dispatch: ReturnType<typeof useAppDispatch>) {
  try {
    const serverNotifications = await listNotifications();

    if (serverNotifications.length > 0) {
      dispatch(setNotifications(serverNotifications.map(normalizeNotification).filter((item) => item.type !== "review_resumed")));
      return;
    }

    const storageKey = getNotificationsStorageKey();
    const localNotifications = readNotificationsFromStorage(storageKey);

    if (localNotifications.length === 0) {
      dispatch(clearNotifications());
      return;
    }

    await Promise.allSettled(
      localNotifications.map((notification) =>
        createNotification({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          href: notification.href,
          reviewId: notification.reviewId,
          dedupeKey: notification.dedupeKey,
          read: notification.read,
          createdAt: notification.createdAt,
        })
      )
    );

    const refreshedNotifications = await listNotifications();
    dispatch(setNotifications(refreshedNotifications.map(normalizeNotification).filter((item) => item.type !== "review_resumed")));

    if (storageKey !== "uxm:notif-items") {
      window.localStorage.setItem(storageKey, JSON.stringify(refreshedNotifications));
    }
  } catch {
    // Keep the current state if the API is temporarily unavailable.
  }
}

export function NotificationBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    const runHydration = () => {
      if (cancelled) return;
      void hydrateNotifications(dispatch);
    };

    runHydration();

    window.addEventListener("storage", runHydration);
    window.addEventListener("uxm:user-updated", runHydration);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", runHydration);
      window.removeEventListener("uxm:user-updated", runHydration);
    };
  }, [dispatch]);

  return null;
}