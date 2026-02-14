import { useCallback, useEffect, useRef, useState } from "react";

// ── Public types ─────────────────────────────────────────────────────

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  /** "danger" renders the item in red */
  variant?: "default" | "danger";
  disabled?: boolean;
  /** When true, the menu stays open after clicking this item */
  keepOpen?: boolean;
  separator?: false;
}

export interface ContextMenuSeparator {
  separator: true;
}

/**
 * A sub-menu item — renders a right-arrow and opens `children` when clicked.
 * `children` receives the current position and an `onBack` callback.
 */
export interface ContextMenuSubMenu {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  subMenu: true;
  children: (props: { onBack: () => void }) => React.ReactNode;
}

/**
 * A slot for completely custom content rendered inside the menu panel
 * (e.g. an inline rename input). When `customContent` is set the normal
 * items list is hidden.
 */
export interface ContextMenuCustomSlot {
  customContent: true;
  children: (props: { onClose: () => void }) => React.ReactNode;
}

export type ContextMenuEntry =
  | ContextMenuItem
  | ContextMenuSeparator
  | ContextMenuSubMenu
  | ContextMenuCustomSlot;

// ── Helpers to narrow union ──────────────────────────────────────────

function isSeparator(e: ContextMenuEntry): e is ContextMenuSeparator {
  return "separator" in e && e.separator === true;
}

function isSubMenu(e: ContextMenuEntry): e is ContextMenuSubMenu {
  return "subMenu" in e && e.subMenu === true;
}

function isCustomSlot(e: ContextMenuEntry): e is ContextMenuCustomSlot {
  return "customContent" in e && e.customContent === true;
}

// ── Props ────────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
  /** Optional min-width override (default "160px") */
  minWidth?: string;
}

// ── Component ────────────────────────────────────────────────────────

export default function ContextMenu({
  x,
  y,
  items,
  onClose,
  minWidth = "160px",
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [pos, setPos] = useState({ x, y });

  // ── Viewport clamping ──
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth - 8)
      nx = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8)
      ny = window.innerHeight - rect.height - 8;
    if (nx < 8) nx = 8;
    if (ny < 8) ny = 8;
    setPos({ x: nx, y: ny });
  }, [x, y, activeSubMenu]);

  // ── Close on outside click / Escape ──
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSubMenu) {
          setActiveSubMenu(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, activeSubMenu],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, handleEscape]);

  const panelClass =
    "fixed z-[9999] overflow-hidden rounded-md border border-light-200 bg-white p-1 shadow-lg dark:border-dark-400 dark:bg-dark-300";

  // ── Check for custom content slot (takes over the whole panel) ──
  const customSlot = items.find(isCustomSlot);
  if (customSlot) {
    return (
      <div
        ref={ref}
        className={panelClass}
        style={{ left: pos.x, top: pos.y, minWidth }}
      >
        {customSlot.children({ onClose })}
      </div>
    );
  }

  // ── Active sub-menu view ──
  const activeSubEntry = activeSubMenu
    ? (items.find(
        (e) => isSubMenu(e) && e.label === activeSubMenu,
      ) as ContextMenuSubMenu | undefined)
    : null;

  if (activeSubEntry) {
    return (
      <div
        ref={ref}
        className={panelClass}
        style={{ left: pos.x, top: pos.y, minWidth }}
      >
        {activeSubEntry.children({
          onBack: () => setActiveSubMenu(null),
        })}
      </div>
    );
  }

  // ── Normal items list ──
  return (
    <div
      ref={ref}
      className={panelClass}
      style={{ left: pos.x, top: pos.y, minWidth }}
    >
      {items.map((item, i) => {
        // Separator
        if (isSeparator(item)) {
          return (
            <div
              key={`sep-${i}`}
              className="my-0.5 border-t border-light-200 dark:border-dark-500"
            />
          );
        }

        // Sub-menu trigger
        if (isSubMenu(item)) {
          return (
            <button
              key={item.label}
              onClick={() => setActiveSubMenu(item.label)}
              disabled={item.disabled}
              className={`flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm transition-colors duration-0 ${
                item.disabled
                  ? "cursor-not-allowed opacity-40"
                  : "text-neutral-900 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-400"
              }`}
            >
              {item.icon && (
                <span className="flex h-4 w-4 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              <svg
                className="h-3 w-3 text-light-600 dark:text-dark-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          );
        }

        // Skip custom slots in the normal render
        if (isCustomSlot(item)) return null;

        // Normal item
        const isDanger = item.variant === "danger";

        return (
          <button
            key={item.label}
            onClick={() => {
              item.onClick();
              if (!item.keepOpen) onClose();
            }}
            disabled={item.disabled}
            className={`flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm transition-colors duration-0 ${
              item.disabled
                ? "cursor-not-allowed opacity-40"
                : isDanger
                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  : "text-neutral-900 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-400"
            }`}
          >
            {item.icon && (
              <span className="flex h-4 w-4 items-center justify-center">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
