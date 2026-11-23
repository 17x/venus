"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "../../lib/utils";

const TooltipIdContext = React.createContext<string | undefined>(undefined);

function TooltipProvider({ delay = 400, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  const generatedId = React.useId();

  return (
    <TooltipIdContext.Provider value={generatedId}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipIdContext.Provider>
  );
}

function TooltipTrigger({ "aria-describedby": ariaDescribedBy, ...props }: TooltipPrimitive.Trigger.Props) {
  const tooltipId = React.useContext(TooltipIdContext);

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      aria-describedby={ariaDescribedBy ?? tooltipId}
      {...props}
    />
  );
}

export interface TooltipContentProps
  extends TooltipPrimitive.Popup.Props,
    Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> {}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  id,
  ...props
}: TooltipContentProps) {
  const tooltipId = React.useContext(TooltipIdContext);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        className="isolate z-50"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          id={id ?? tooltipId}
          role="tooltip"
          className={cn(
            "max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-[var(--shadow-popover)]",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="size-2 rotate-45 bg-foreground fill-foreground" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export interface WithTooltipProps
  extends Pick<TooltipContentProps, "align" | "alignOffset" | "side" | "sideOffset"> {
  children: React.ReactElement;
  content?: React.ReactNode;
  delay?: number;
}

/** Adds supplementary hover/focus help without adding tooltip props to every control. */
function WithTooltip({ children, content, delay, ...contentProps }: WithTooltipProps) {
  if (content === undefined || content === null || content === "") {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger delay={delay} render={children} />
      <TooltipContent {...contentProps}>{content}</TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, WithTooltip };
