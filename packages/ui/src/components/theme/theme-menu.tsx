"use client";

import { CheckIcon, MoonIcon, PaletteIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { resolveThemeName, themeNames, themeStorageKey, type ThemeName } from "../../lib/theme/config";

export type ThemeLabels = {
  classicLight: string;
  classicDark: string;
  cartoon: string;
};

type ThemeMenuProps = {
  labels: ThemeLabels;
  title: string;
};

const themeIcons = {
  "classic-light": SunIcon,
  "classic-dark": MoonIcon,
  cartoon: SparklesIcon
} satisfies Record<ThemeName, typeof SunIcon>;

export function ThemeMenu({ labels, title }: ThemeMenuProps) {
  const [theme, setThemeState] = useState<ThemeName>("classic-light");

  useEffect(() => {
    const nextTheme = resolveThemeName(localStorage.getItem(themeStorageKey));
    applyTheme(nextTheme);
    setThemeState(nextTheme);
  }, []);

  return (
    <div className="group/menu relative">
      <Button aria-label={title} aria-haspopup="menu" size="icon" type="button" variant="outline">
        <PaletteIcon data-icon="inline-start" />
      </Button>
      <div className="invisible absolute right-0 top-full z-20 pt-1 opacity-0 transition group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100">
        <div
          className="min-w-40 rounded-md border bg-card p-1 text-card-foreground"
          role="menu"
        >
          {themeNames.map((item) => {
            const Icon = themeIcons[item];

            return (
              <button
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-[hsl(var(--state-hover))] hover:text-accent-foreground active:bg-[hsl(var(--state-active))] focus-visible:bg-[hsl(var(--state-hover))] focus-visible:text-accent-foreground"
                key={item}
                role="menuitemradio"
                aria-checked={theme === item}
                type="button"
                onClick={() => {
                  applyTheme(item);
                  setThemeState(item);
                }}
              >
                <span className="flex items-center gap-2">
                  <Icon data-icon="inline-start" />
                  {getThemeLabel(labels, item)}
                </span>
                {theme === item ? <CheckIcon data-icon="inline-start" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeStorageKey, theme);
}

function getThemeLabel(labels: ThemeLabels, theme: ThemeName) {
  if (theme === "classic-dark") {
    return labels.classicDark;
  }

  if (theme === "cartoon") {
    return labels.cartoon;
  }

  return labels.classicLight;
}
