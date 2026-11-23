"use client";

import * as React from "react";

export type ValidationTone = "default" | "success" | "warning" | "error";

export interface FieldState {
  describedBy?: string;
  disabled: boolean;
  registerDescription?: (id: string) => () => void;
  validation: ValidationTone;
}

export const FieldStateContext = React.createContext<FieldState>({
  disabled: false,
  validation: "default"
});

export function useFieldState(): FieldState {
  return React.useContext(FieldStateContext);
}
