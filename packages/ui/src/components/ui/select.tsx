import * as React from "react";

import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none transition-colors hover:bg-[hsl(var(--state-hover))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 disabled:cursor-[var(--cursor-disabled)] disabled:opacity-[var(--state-disabled-opacity)]",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";

export { Select };
