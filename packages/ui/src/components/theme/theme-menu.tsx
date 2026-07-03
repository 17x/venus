"use client";

import { CheckIcon, MoonIcon, PaletteIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
  const menuId = useId();
  const [theme, setThemeState] = useState<ThemeName>("classic-light");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextTheme = resolveThemeName(localStorage.getItem(themeStorageKey));
    applyTheme(nextTheme);
    setThemeState(nextTheme);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={title}
        aria-haspopup="menu"
        size="icon"
        type="button"
        variant="outline"
        onClick={() => setOpen((current) => !current)}
      >
        <PaletteIcon data-icon="inline-start" />
      </Button>
      <div className={open ? "absolute right-0 top-full z-20 pt-1 opacity-100" : "invisible absolute right-0 top-full z-20 pt-1 opacity-0"}>
        <div
          className="min-w-44 rounded-md border bg-card p-1 text-card-foreground shadow-[var(--shadow-popover)]"
          id={menuId}
          role="menu"
        >
          {themeNames.map((item) => {
            const Icon = themeIcons[item];

            return (
              <button
                className="flex w-full cursor-[var(--cursor-action)] items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none transition-[background-color,color,box-shadow,transform] hover:-translate-y-px hover:bg-[hsl(var(--state-hover))] hover:text-accent-foreground active:translate-y-0 active:bg-[hsl(var(--state-active))] focus-visible:bg-[hsl(var(--state-hover))] focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 aria-checked:bg-[hsl(var(--state-active))] aria-checked:text-foreground"
                key={item}
                role="menuitemradio"
                aria-checked={theme === item}
                type="button"
                onClick={() => {
                  applyTheme(item);
                  setThemeState(item);
                  setOpen(false);
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
ThemeMenu.displayName = 'ThemeMenu';

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
