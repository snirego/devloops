import Link from "next/link";
import { twMerge } from "tailwind-merge";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  openInNewTab?: boolean;
}

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className,
  onClick,
  openInNewTab,
}: ButtonProps) {
  const classes = twMerge(
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 whitespace-nowrap",
    size === "sm" && "px-4 py-2 text-sm",
    size === "md" && "px-6 py-2.5 text-sm",
    size === "lg" && "px-8 py-3.5 text-base",
    variant === "primary" &&
      "bg-light-1000 text-light-50 hover:bg-light-900 dark:bg-dark-1000 dark:text-dark-50 dark:hover:bg-dark-950 shadow-lg shadow-black/10 dark:shadow-white/5",
    variant === "secondary" &&
      "border border-light-400 text-light-1000 hover:bg-light-200 dark:border-dark-400 dark:text-dark-1000 dark:hover:bg-dark-200",
    variant === "ghost" &&
      "text-light-900 hover:text-light-1000 dark:text-dark-900 dark:hover:text-dark-1000",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
