import * as React from "react"

import { cn } from "../lib/cn.ts"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full cursor-text rounded-lg bg-transparent px-2.5 py-2 text-base transition-[background-color,border-color,box-shadow] outline-none placeholder:text-muted-foreground hover:bg-muted/50 focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 disabled:hover:bg-input/50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
