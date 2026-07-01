import * as React from "react";

import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    data-slot="select"
    className={cn(
      "flex h-8 w-full cursor-[var(--cursor-action)] rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/30 hover:bg-[hsl(var(--state-hover))] active:bg-[hsl(var(--state-active))] focus-visible:border-ring/45 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-[var(--cursor-disabled)] disabled:opacity-[var(--state-disabled-opacity)] disabled:hover:border-input disabled:hover:bg-background",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";

export { Select };
