/** Shared form-control density contract. Touch devices raise the hit target in CSS. */
export type ControlSize = "sm" | "md" | "lg";

export const controlSizeClassNames: Readonly<Record<ControlSize, string>> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-10 px-3.5 text-sm"
};
