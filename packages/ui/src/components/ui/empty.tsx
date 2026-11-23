import * as React from "react";

import { cn } from "../../lib/utils";

function Empty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/20 p-6 text-center",
        className
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="empty-header" className={cn("flex max-w-sm flex-col items-center gap-1.5", className)} {...props} />;
}

function EmptyMedia({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="empty-media"
      className={cn("grid size-10 place-items-center rounded-full bg-muted text-muted-foreground", className)}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 data-slot="empty-title" className={cn("text-sm font-semibold", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="empty-description" className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function EmptyContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="empty-content" className={cn("flex flex-wrap items-center justify-center gap-2", className)} {...props} />;
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
