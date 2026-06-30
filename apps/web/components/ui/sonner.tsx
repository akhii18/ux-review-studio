"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ position = "top-right", ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position={position}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg",
          error: "!bg-red-600 !text-white !border-red-700",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
