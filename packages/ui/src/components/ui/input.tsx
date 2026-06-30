import * as React from "react";

import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground hover:bg-[hsl(var(--state-hover))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 disabled:cursor-[var(--cursor-disabled)] disabled:opacity-[var(--state-disabled-opacity)]",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
