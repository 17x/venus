"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, MoonIcon, PaletteIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { isDarkTheme, resolveThemeName, themeNames, themeStorageKey, type ThemeName } from "../../lib/theme/config";
import { Button } from "../ui/button";

export type ThemeLabels = {
  classicLight: string;
  classicDark: string;
  cartoon: string;
  cartoonDark: string;
};

type ThemeMenuProps = {
  labels: ThemeLabels;
  title: string;
};

const themeIcons = {
  "classic-light": SunIcon,
  "classic-dark": MoonIcon,
  cartoon: SparklesIcon,
  "cartoon-dark": MoonIcon
} satisfies Record<ThemeName, typeof SunIcon>;

export function ThemeMenu({ labels, title }: ThemeMenuProps) {
  const [theme, setThemeState] = useState<ThemeName>("classic-light");

  useEffect(() => {
    const nextTheme = resolveThemeName(localStorage.getItem(themeStorageKey));
    applyTheme(nextTheme);
    setThemeState(nextTheme);
  }, []);

  const setTheme = (nextTheme: unknown) => {
    const resolvedTheme = resolveThemeName(nextTheme);
    applyTheme(resolvedTheme);
    setThemeState(resolvedTheme);
  };

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        render={
          <Button aria-label={title} size="icon" type="button" variant="outline">
            <PaletteIcon aria-hidden="true" data-icon="inline-start" />
          </Button>
        }
      />
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" className="isolate outline-none" side="bottom" sideOffset={4}>
          <MenuPrimitive.Popup className="min-w-44 rounded-md border bg-card p-1 text-card-foreground shadow-[var(--shadow-popover)] outline-none">
            <MenuPrimitive.RadioGroup value={theme} onValueChange={setTheme}>
              {themeNames.map((item) => {
                const Icon = themeIcons[item];

                return (
                  <MenuPrimitive.RadioItem
                    className="relative flex cursor-[var(--cursor-action)] items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-xs outline-none transition-[background-color,color,transform] hover:bg-[hsl(var(--state-hover))] hover:text-foreground active:translate-y-px active:bg-[hsl(var(--state-active))] focus:bg-[hsl(var(--state-hover))] focus:text-foreground data-disabled:cursor-[var(--cursor-disabled)] data-disabled:opacity-[var(--state-disabled-opacity)]"
                    closeOnClick
                    key={item}
                    value={item}
                  >
                    <Icon aria-hidden="true" data-icon="inline-start" />
                    {getThemeLabel(labels, item)}
                    <span className="pointer-events-none absolute right-2 flex items-center justify-center">
                      <MenuPrimitive.RadioItemIndicator>
                        <CheckIcon aria-hidden="true" data-icon="inline-start" />
                      </MenuPrimitive.RadioItemIndicator>
                    </span>
                  </MenuPrimitive.RadioItem>
                );
              })}
            </MenuPrimitive.RadioGroup>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
ThemeMenu.displayName = "ThemeMenu";

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = isDarkTheme(theme) ? "dark" : "light";
  localStorage.setItem(themeStorageKey, theme);
}

function getThemeLabel(labels: ThemeLabels, theme: ThemeName): string {
  if (theme === "classic-dark") {
    return labels.classicDark;
  }

  if (theme === "cartoon") {
    return labels.cartoon;
  }

  if (theme === "cartoon-dark") {
    return labels.cartoonDark;
  }

  return labels.classicLight;
}
