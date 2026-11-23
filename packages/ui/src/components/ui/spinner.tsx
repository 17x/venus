import * as React from "react";

import { cn } from "../../lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
}

const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(({ className, label, ...props }, ref) => (
  <span
    ref={ref}
    role="status"
    aria-label={label}
    data-slot="spinner"
    className={cn("inline-flex size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    {...props}
  />
));
Spinner.displayName = "Spinner";

export { Spinner };
