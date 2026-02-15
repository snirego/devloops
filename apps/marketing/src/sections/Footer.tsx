import Link from "next/link";
import { FaDiscord } from "react-icons/fa";
import { HiOutlineEnvelope } from "react-icons/hi2";

const navigation = {
  product: [
    { name: "How it works", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Changelog", href: "https://docs.devloops.io/changelog" },
  ],
  resources: [
    { name: "Documentation", href: "https://docs.devloops.io" },
    { name: "API Reference", href: "https://docs.devloops.io/api-reference/introduction" },
    { name: "FAQ", href: "#faq" },
  ],
  company: [
    { name: "Discord", href: "https://discord.gg/e6ejRb6CmT" },
    { name: "Contact", href: "mailto:support@devloops.io" },
  ],
  legal: [
    { name: "Terms", href: "https://app.devloops.io/terms" },
    { name: "Privacy", href: "https://app.devloops.io/privacy" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-light-200 bg-light-50 dark:border-dark-300 dark:bg-dark-50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          {/* Brand col */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <Link href="/" className="text-lg font-bold text-light-1000 dark:text-dark-1000">
              Devloops
            </Link>
            <p className="mt-2 max-w-xs text-sm text-light-800 dark:text-dark-800">
              AI agents that turn customer feedback into shipped code. Built for startups that move fast.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href="https://discord.gg/e6ejRb6CmT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-light-300 text-light-900 transition-colors hover:bg-light-200 dark:border-dark-400 dark:text-dark-900 dark:hover:bg-dark-200"
              >
                <FaDiscord size={16} />
              </a>
              <a
                href="mailto:support@devloops.io"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-light-300 text-light-900 transition-colors hover:bg-light-200 dark:border-dark-400 dark:text-dark-900 dark:hover:bg-dark-200"
              >
                <HiOutlineEnvelope size={16} />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(navigation).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-light-1000 dark:text-dark-1000">
                {title}
              </h4>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") || item.href.startsWith("mailto") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-sm text-light-800 transition-colors hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-light-200 pt-8 dark:border-dark-300 sm:flex-row">
          <p className="text-xs text-light-700 dark:text-dark-700">
            &copy; {new Date().getFullYear()} Devloops. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="relative h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-green-500/30" />
              <span className="absolute inset-0 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-light-700 dark:text-dark-700">
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
