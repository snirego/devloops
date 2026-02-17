import { t } from "@lingui/core/macro";
import { twMerge } from "tailwind-merge";
import { HiOutlineCheck } from "react-icons/hi2";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export default function AutoSaveIndicator({
  status,
  className,
}: AutoSaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <span
      className={twMerge(
        "inline-flex items-center gap-1 text-[11px] font-medium transition-opacity duration-300",
        status === "saving" && "text-light-700 dark:text-dark-700",
        status === "saved" && "text-green-500 dark:text-green-400",
        status === "error" && "text-red-500 dark:text-red-400",
        className,
      )}
    >
      {status === "saving" && (
        <>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-light-700 dark:bg-dark-700" />
          {t`Saving...`}
        </>
      )}
      {status === "saved" && (
        <>
          <HiOutlineCheck className="h-3 w-3" />
          {t`Saved`}
        </>
      )}
      {status === "error" && t`Failed to save`}
    </span>
  );
}

export type { SaveStatus };
