"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ position = "top-right", ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position={position}
      visibleToasts={1}
      closeButton
      toastOptions={{
        duration: Infinity,
        classNames: {
          toast: "group toast pointer-events-auto group-[.toaster]:shadow-lg [&_[data-close-button]]:!opacity-100 [&_[data-close-button]]:!pointer-events-auto [&_[data-close-button]]:!text-foreground [&_[data-close-button]]:!bg-background [&_[data-close-button]]:!border-border [&_[data-close-button]]:!rounded-md [&_[data-close-button]]:!p-1",
          error: "!bg-red-600 !text-white !border-red-700 [&_[data-close-button]]:!text-white [&_[data-close-button]]:!bg-red-700 [&_[data-close-button]]:!border-red-500 [&_[data-close-button]]:!pointer-events-auto",
          description: "group-[.toast]:text-muted-foreground",
          closeButton: "!opacity-100 !pointer-events-auto",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
