import { twMerge } from "tailwind-merge";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center gap-1.5 rounded-full border border-light-300 bg-light-50 px-3.5 py-1 text-xs font-medium text-light-900 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-900",
        className
      )}
    >
      {children}
    </span>
  );
}
