export const themeStorageKey = "erp-theme";

export const themeNames = ["classic-light", "classic-dark", "cartoon"] as const;

export type ThemeName = (typeof themeNames)[number];

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && themeNames.includes(value as ThemeName);
}

export function resolveThemeName(value: unknown): ThemeName {
  return isThemeName(value) ? value : "classic-light";
}
