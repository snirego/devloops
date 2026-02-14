import { useEffect, useRef, useState } from "react";
import { HiCheck, HiChevronDown } from "react-icons/hi2";

// ── Role metadata ─────────────────────────────────────────────────────

interface RoleOption {
  value: string;
  label: string;
  description: string;
  badgeClass: string;
}

const ROLES: RoleOption[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access to all workspace settings and members",
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
  },
  {
    value: "member",
    label: "Member",
    description: "Can create and manage boards, lists, and cards",
    badgeClass:
      "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400",
  },
  {
    value: "tester",
    label: "Tester",
    description: "Can view boards and create or edit cards",
    badgeClass:
      "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  },
  {
    value: "guest",
    label: "Guest",
    description: "Read-only access to boards and cards",
    badgeClass:
      "bg-gray-500/10 text-gray-600 ring-gray-500/20 dark:text-gray-400",
  },
];

// ── Props ─────────────────────────────────────────────────────────────

interface RolePickerDropdownProps {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export default function RolePickerDropdown({
  value,
  onChange,
  disabled,
}: RolePickerDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = ROLES.find((r) => r.value === value) ?? ROLES[1]!;

  // ── Close on outside click ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={
          "flex w-full items-center gap-2 rounded-md border border-light-200 bg-light-50 px-3 py-2 text-sm transition-colors " +
          "hover:border-light-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 " +
          "dark:border-dark-400 dark:bg-dark-200 dark:hover:border-dark-500 dark:focus:border-violet-500 " +
          "disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <span
          className={`inline-flex flex-shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${selected.badgeClass}`}
        >
          {selected.label}
        </span>
        <span className="truncate text-xs text-light-800 dark:text-dark-800">
          {selected.description}
        </span>
        <HiChevronDown
          className={`ml-auto h-4 w-4 flex-shrink-0 text-light-800 transition-transform dark:text-dark-800 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel — styled to match ContextMenu */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 z-[9999] mt-1 w-full overflow-hidden rounded-md border border-light-200 bg-white p-1 shadow-lg dark:border-dark-400 dark:bg-dark-300"
        >
          {ROLES.map((role) => {
            const isSelected = role.value === value;

            return (
              <button
                key={role.value}
                type="button"
                onClick={() => {
                  onChange(role.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-[5px] px-2.5 py-2 text-left transition-colors duration-0 ${
                  isSelected
                    ? "bg-light-100 dark:bg-dark-400"
                    : "hover:bg-light-200 dark:hover:bg-dark-400"
                }`}
              >
                {/* Role badge + description */}
                <div className="flex flex-1 flex-col gap-0.5">
                  <span
                    className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${role.badgeClass}`}
                  >
                    {role.label}
                  </span>
                  <span className="text-xs text-light-800 dark:text-dark-800">
                    {role.description}
                  </span>
                </div>

                {/* Check on the right — only when selected */}
                {isSelected && (
                  <HiCheck className="h-3.5 w-3.5 flex-shrink-0 text-violet-600 dark:text-violet-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
