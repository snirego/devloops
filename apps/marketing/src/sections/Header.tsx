import Link from "next/link";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { HiMiniBars3, HiMiniXMark } from "react-icons/hi2";

import Button from "~/components/Button";

const navItems = [
  { label: "How it works", href: "#features" },
  { label: "On the go", href: "#on-the-go" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={twMerge(
          "fixed top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "bg-light-50/80 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] backdrop-blur-xl dark:bg-dark-50/80 dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)]"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              Devloops
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-light-900 transition-colors hover:text-light-1000 dark:text-dark-900 dark:hover:text-dark-1000"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" href="https://app.devloops.io/login" size="sm">
              Sign in
            </Button>
            <Button href="https://app.devloops.io/signup" size="sm">
              Get Started
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative z-50 p-2 text-light-1000 dark:text-dark-1000 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <HiMiniXMark size={22} /> : <HiMiniBars3 size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={twMerge(
          "fixed inset-0 z-40 bg-light-50/95 backdrop-blur-xl transition-all duration-300 dark:bg-dark-50/95 md:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <div className="flex h-full flex-col items-center justify-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="text-xl font-semibold text-light-1000 dark:text-dark-1000"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col items-center gap-3">
            <Button href="https://app.devloops.io/login" variant="secondary" size="lg">
              Sign in
            </Button>
            <Button href="https://app.devloops.io/signup" size="lg">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
