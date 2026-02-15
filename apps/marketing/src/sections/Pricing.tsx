import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HiCheckCircle } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import SectionWrapper from "~/components/SectionWrapper";
import Badge from "~/components/Badge";
import Button from "~/components/Button";

type BillingCycle = "monthly" | "yearly";

interface Tier {
  name: string;
  id: string;
  monthly: number;
  yearly: number;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  cta: string;
}

const tiers: Tier[] = [
  {
    name: "Basic",
    id: "basic",
    monthly: 16,
    yearly: 8,
    description:
      "Everything your startup needs to close the feedback loop. AI analysis and ticket generation included.",
    features: [
      "Unlimited feedback sources",
      "AI auto-analysis & categorization",
      "Auto-generated tickets",
      "Up to 10 workspace members",
      "Labels, filters & checklists",
      "Activity log",
      "Email support",
    ],
    highlighted: false,
    cta: "Get Started",
  },
  {
    name: "Pro",
    id: "pro",
    monthly: 24,
    yearly: 12,
    description:
      "For teams that want AI agent prompts, unlimited scale, and the full autonomous pipeline.",
    features: [
      "Everything in Basic",
      "Unlimited workspace members",
      "AI-generated agent prompts",
      "One-click agent execution",
      "Custom workspace URL",
      "Priority support",
      "Advanced integrations",
      "Admin roles & permissions",
    ],
    highlighted: true,
    badge: "Most Popular",
    cta: "Get Started",
  },
];

function PriceDisplay({ amount, cycle }: { amount: number; cycle: BillingCycle }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-sm font-medium text-light-800 dark:text-dark-800">$</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={`${amount}-${cycle}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="text-4xl font-extrabold tabular-nums text-light-1000 dark:text-dark-1000 sm:text-5xl"
        >
          {amount}
        </motion.span>
      </AnimatePresence>
      <span className="text-sm font-medium text-light-800 dark:text-dark-800">
        /mo / member
      </span>
    </div>
  );
}

export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");

  return (
    <SectionWrapper className="py-20 sm:py-28" id="pricing">
      <div className="mx-auto max-w-5xl px-5">
        <div className="text-center">
          <Badge>Pricing</Badge>
          <h2 className="mt-4 text-3xl font-bold text-light-1000 dark:text-dark-1000 sm:text-4xl">
            Simple pricing.{" "}
            <span className="gradient-text">Massive time saved.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-light-900 dark:text-dark-900">
            No hidden fees. No per-feature charges. Pick a plan and start shipping faster today.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            onClick={() => setCycle("monthly")}
            className={twMerge(
              "rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150",
              cycle === "monthly"
                ? "bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/25"
                : "bg-light-200 text-light-700 hover:bg-light-300 hover:text-light-1000 dark:bg-dark-200 dark:text-dark-700 dark:hover:bg-dark-300 dark:hover:text-dark-1000"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={twMerge(
              "flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150",
              cycle === "yearly"
                ? "bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/25"
                : "bg-light-200 text-light-700 hover:bg-light-300 hover:text-light-1000 dark:bg-dark-200 dark:text-dark-700 dark:hover:bg-dark-300 dark:hover:text-dark-1000"
            )}
          >
            Yearly
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-500/20 dark:text-green-400">
              -50%
            </span>
          </button>
        </div>

        {/* Pricing cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {tiers.map((tier) => (
            <motion.div
              key={tier.id}
              layout
              className={twMerge(
                "relative overflow-hidden rounded-2xl p-6 sm:p-8",
                tier.highlighted
                  ? "border-2 border-brand-500/30 bg-gradient-to-b from-white to-brand-50/30 shadow-xl shadow-brand-500/5 dark:border-brand-500/20 dark:from-dark-100 dark:to-brand-500/5"
                  : "border border-light-200 bg-white dark:border-dark-300 dark:bg-dark-100"
              )}
            >
              {/* Glow for highlighted */}
              {tier.highlighted && (
                <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/20" />
              )}

              <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-light-1000 dark:text-dark-1000">
                    {tier.name}
                  </h3>
                  {tier.badge && (
                    <span className="rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      {tier.badge}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-light-800 dark:text-dark-800">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mt-6">
                  <PriceDisplay
                    amount={cycle === "monthly" ? tier.monthly : tier.yearly}
                    cycle={cycle}
                  />
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <Button
                    href="https://app.devloops.io/signup"
                    variant={tier.highlighted ? "primary" : "secondary"}
                    size="lg"
                    className="w-full"
                  >
                    {tier.cta}
                  </Button>
                </div>

                {/* Features */}
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <HiCheckCircle
                        className={twMerge(
                          "mt-0.5 h-4 w-4 flex-shrink-0",
                          tier.highlighted
                            ? "text-brand-500"
                            : "text-light-700 dark:text-dark-700"
                        )}
                      />
                      <span className="text-sm text-light-900 dark:text-dark-900">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-8 text-center text-sm text-light-700 dark:text-dark-700">
          By subscribing, you agree to our{" "}
          <Link href="/tos" className="underline hover:text-light-1000 dark:hover:text-dark-1000">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-light-1000 dark:hover:text-dark-1000">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </SectionWrapper>
  );
}
