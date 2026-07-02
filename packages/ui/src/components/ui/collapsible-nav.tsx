"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CollapsibleNavItem {
  id: string;
  label: string;
  href?: string;
  defaultOpen?: boolean;
  items?: CollapsibleNavItem[];
}

export interface CollapsibleNavProps extends React.HTMLAttributes<HTMLElement> {
  items: CollapsibleNavItem[];
  ariaLabel?: string;
}

function collectOpenState(items: readonly CollapsibleNavItem[]) {
  const state: Record<string, boolean> = {};
  const visit = (item: CollapsibleNavItem) => {
    if (item.items?.length) {
      state[item.id] = item.defaultOpen ?? true;
      item.items.forEach(visit);
    }
  };
  items.forEach(visit);
  return state;
}

function CollapsibleNavTree({
  items,
  depth,
  openState,
  toggleItem,
}: {
  items: readonly CollapsibleNavItem[];
  depth: number;
  openState: Record<string, boolean>;
  toggleItem: (id: string) => void;
}) {
  return (
    <ul role={depth === 0 ? "tree" : "group"} className="flex flex-col gap-0.5">
      {items.map((item) => {
        const hasChildren = Boolean(item.items?.length);
        const isOpen = openState[item.id] ?? true;
        // Indent so child's left edge aligns with its parent's text left edge.
        // Parent text starts at: parentIndent + chevron(28px) + gap(4px) = parentIndent + 32px.
        const INDENT_PER_LEVEL = 32;
        const rowIndent = depth * INDENT_PER_LEVEL;

        return (
          <li key={item.id} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} className="min-w-0">
            <div
              style={{ paddingLeft: rowIndent }}
              className={cn(
                "group/nav-row flex min-h-8 min-w-0 items-center gap-1 rounded-md text-sm transition-[background-color,color,box-shadow] hover:bg-[hsl(var(--state-hover))] focus-within:bg-[hsl(var(--state-hover))]",
                depth > 0 && "min-h-7 text-xs",
              )}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${item.id}-items`}
                  data-state={isOpen ? "open" : "closed"}
                  className="flex size-7 shrink-0 cursor-[var(--cursor-action)] items-center justify-center rounded-md text-muted-foreground outline-none transition-[background-color,color,box-shadow] hover:bg-background/70 hover:text-foreground active:bg-[hsl(var(--state-active))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1"
                  onClick={() => toggleItem(item.id)}
                >
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-150"
                    style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transformOrigin: "center" }}
                  />
                </button>
              ) : null}
              {item.href ? (
                <a
                  href={item.href}
                  className={cn(
                    "min-w-0 flex-1 cursor-[var(--cursor-action)] truncate rounded-md py-1.5 pr-2 text-muted-foreground outline-none transition-[background-color,color,box-shadow,transform] group-hover/nav-row:text-foreground hover:text-foreground active:translate-y-px active:text-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1",
                    hasChildren && "font-medium text-foreground",
                    depth > 0 && "py-1",
                    // Leaf items at depth > 0: ml-8 (32px = chevron + gap) so text aligns with items that have chevrons.
                    !hasChildren && depth > 0 && "ml-8",
                  )}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate py-1.5 pr-2 text-muted-foreground",
                    hasChildren && "font-medium text-foreground",
                    depth > 0 && "py-1",
                    !hasChildren && depth > 0 && "ml-8",
                  )}
                >
                  {item.label}
                </span>
              )}
            </div>
            {hasChildren && isOpen ? (
              <div id={`${item.id}-items`} role="region" aria-label={`${item.label} sub-navigation`} className="mt-1">
                <CollapsibleNavTree
                  items={item.items ?? []}
                  depth={depth + 1}
                  openState={openState}
                  toggleItem={toggleItem}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function CollapsibleNav({
  items,
  ariaLabel = "Navigation",
  className,
  ...props
}: CollapsibleNavProps) {
  const [openState, setOpenState] = React.useState(() => collectOpenState(items));

  React.useEffect(() => {
    setOpenState(collectOpenState(items));
  }, [items]);

  const toggleItem = React.useCallback((id: string) => {
    setOpenState((current) => ({ ...current, [id]: !(current[id] ?? true) }));
  }, []);

  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-col gap-2", className)} {...props}>
      <CollapsibleNavTree items={items} depth={0} openState={openState} toggleItem={toggleItem} />
    </nav>
  );
}
CollapsibleNav.displayName = 'CollapsibleNav';
