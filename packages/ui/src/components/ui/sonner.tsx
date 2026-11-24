"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { Toaster as SonnerToaster, toast, type ToasterProps } from "sonner";

import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

function Toaster({ className, toastOptions, ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className={cn("toaster", className)}
      icons={{
        close: <X aria-hidden="true" />,
        error: <CircleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <Spinner label="Loading" />,
        success: <CircleCheck aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />
      }}
      theme="system"
      toastOptions={{
        ...toastOptions,
        classNames: {
          actionButton: "inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))]",
          cancelButton: "inline-flex h-7 items-center justify-center rounded-md border bg-background px-2.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))]",
          closeButton: "inline-flex cursor-[var(--cursor-action)] items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] [&_svg:not([class*='size-'])]:size-4",
          content: "min-w-0 flex-1",
          description: "mt-0.5 text-xs leading-5 text-muted-foreground",
          error: "border-destructive/35",
          icon: "shrink-0 [&_svg:not([class*='size-'])]:size-4",
          info: "border-[hsl(var(--state-info)/0.35)]",
          loading: "border-ring/35",
          success: "border-[hsl(var(--state-success)/0.35)]",
          title: "text-xs font-medium text-foreground",
          toast: "flex w-full items-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-[var(--shadow-popover)]",
          warning: "border-[hsl(var(--state-warning)/0.35)]",
          ...toastOptions?.classNames
        },
        unstyled: true
      }}
      {...props}
    />
  );
}

export { Toaster, toast, type ToasterProps };
