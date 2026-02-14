import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  separator?: false;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Clamp position so it doesn't overflow the viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    if (rect.left > maxX) ref.current.style.left = `${maxX}px`;
    if (rect.top > maxY) ref.current.style.top = `${maxY}px`;
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[160px] overflow-hidden rounded-lg border border-light-200 bg-white py-1 shadow-xl dark:border-dark-300 dark:bg-dark-100"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${i}`}
              className="my-1 border-t border-light-200 dark:border-dark-300"
            />
          );
        }

        const isDanger = item.variant === "danger";

        return (
          <button
            key={item.label}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            disabled={item.disabled}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors duration-0 ${
              item.disabled
                ? "cursor-not-allowed opacity-40"
                : isDanger
                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  : "text-light-900 hover:bg-light-100 dark:text-dark-900 dark:hover:bg-dark-200"
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
