import { CircleAlert } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Alert, AlertTitle } from "./alert";

export interface FormErrorSummaryItem {
  id: string;
  message: React.ReactNode;
  href?: string;
}

export interface FormErrorSummaryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  errors: readonly FormErrorSummaryItem[];
  title?: React.ReactNode;
}

const FormErrorSummary = React.forwardRef<HTMLDivElement, FormErrorSummaryProps>(
  ({ className, errors, title = "Check the highlighted fields", ...props }, ref) => {
    const titleId = React.useId();

    if (errors.length === 0) {
      return null;
    }

    return (
      <Alert
        ref={ref}
        aria-labelledby={titleId}
        className={cn("grid-cols-[auto_1fr] items-start", className)}
        data-slot="form-error-summary"
        tabIndex={-1}
        variant="destructive"
        {...props}
      >
        <CircleAlert aria-hidden="true" className="mt-0.5" />
        <div className="min-w-0">
          <AlertTitle id={titleId}>{title}</AlertTitle>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-5">
            {errors.map((error) => (
              <li key={error.id}>
                <a className="rounded-sm underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))]" href={error.href ?? `#${error.id}`}>
                  {error.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Alert>
    );
  }
);
FormErrorSummary.displayName = "FormErrorSummary";

export { FormErrorSummary };
