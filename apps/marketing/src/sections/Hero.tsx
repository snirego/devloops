import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { HiSparkles } from "react-icons/hi2";

import Button from "~/components/Button";
import Badge from "~/components/Badge";

/* ─── Pipeline Animation: Feedback → Ticket → Agent ─── */

interface FeedbackItem {
  id: number;
  text: string;
  source: string;
  sourceColor: string;
}

const feedbackItems: FeedbackItem[] = [
  { id: 1, text: "Login page crashes on mobile", source: "Intercom", sourceColor: "#1f8ded" },
  { id: 2, text: "Need bulk CSV export feature", source: "Slack", sourceColor: "#4a154b" },
  { id: 3, text: "Checkout flow is confusing", source: "Email", sourceColor: "#ea4335" },
  { id: 4, text: "API rate limits are too low", source: "Zendesk", sourceColor: "#03363d" },
  { id: 5, text: "Dark mode looks broken", source: "Twitter", sourceColor: "#1d9bf0" },
];

/* ─── Individual Stage Cards (all use fixed inner height) ─── */

function StageHeader({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 sm:mb-2.5">
      <div className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${pulse ? "animate-pulse" : ""}`} style={{ backgroundColor: color }} />
      <span className="text-[8px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700 sm:text-[9px]">{label}</span>
    </div>
  );
}

function FeedbackStage({ feedback, isActive }: { feedback: FeedbackItem; isActive: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 lg:p-4 ${isActive ? "bg-brand-50/60 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
      <StageHeader color="#3b82f6" label="Feedback" />
      {/* Fixed-height container prevents layout shift */}
      <div className="h-[72px] sm:h-[80px]">
        <div className="h-full rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100 sm:p-2.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={feedback.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25 }}
              className="flex h-full flex-col justify-center"
            >
              <div className="mb-1 flex items-center gap-1">
                <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white sm:text-[8px]" style={{ backgroundColor: feedback.sourceColor }}>{feedback.source}</span>
              </div>
              <p className="line-clamp-2 text-[9px] leading-snug text-light-900 dark:text-dark-900 sm:text-[10px]">{feedback.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TriageStage({ isActive }: { isActive: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 lg:p-4 ${isActive ? "bg-purple-50/60 ring-1 ring-purple-200 dark:bg-purple-500/10 dark:ring-purple-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
      <StageHeader color="#a855f7" label="AI Triage" />
      <div className="h-[72px] sm:h-[80px]">
        <div className="flex h-full flex-col justify-center rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100 sm:p-2.5">
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-1.5 flex items-center gap-1">
                  <HiSparkles className="h-2.5 w-2.5 text-purple-500 sm:h-3 sm:w-3" />
                  <span className="text-[8px] font-semibold text-purple-600 dark:text-purple-400 sm:text-[9px]">Analyzing...</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-light-700 dark:text-dark-700 sm:text-[9px]">Type</span>
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[7px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400 sm:text-[8px]">Bug</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-light-700 dark:text-dark-700 sm:text-[9px]">Priority</span>
                    <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[7px] font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 sm:text-[8px]">High</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center"
              >
                <div className="h-3 w-12 rounded-full bg-light-200 dark:bg-dark-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TicketStage({ isActive }: { isActive: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 lg:p-4 ${isActive ? "bg-green-50/60 ring-1 ring-green-200 dark:bg-green-500/10 dark:ring-green-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
      <StageHeader color="#22c55e" label="Ticket" />
      <div className="h-[72px] sm:h-[80px]">
        <div className="flex h-full flex-col justify-center rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100 sm:p-2.5">
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-[9px] font-semibold text-light-1000 dark:text-dark-1000 sm:text-[10px]">BUG-347</p>
                <p className="mt-0.5 text-[8px] text-light-700 dark:text-dark-700 sm:text-[9px]">Auto-generated prompt</p>
                <div className="mt-1 rounded-md bg-light-100 p-1 dark:bg-dark-200">
                  <p className="truncate text-[7px] font-mono text-brand-600 dark:text-brand-400 sm:text-[8px]">Fix mobile crash on login view...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center"
              >
                <div className="h-3 w-12 rounded-full bg-light-200 dark:bg-dark-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AgentStage({ isActive }: { isActive: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 lg:p-4 ${isActive ? "bg-brand-50/60 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
      <StageHeader color={isActive ? "#6366f1" : "#a5b4fc"} label="Agent" pulse={isActive} />
      <div className="h-[72px] sm:h-[80px]">
        <div className="flex h-full flex-col justify-center rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100 sm:p-2.5">
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-1 flex items-center gap-1">
                  <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 sm:h-3 sm:w-3" />
                  </span>
                  <span className="text-[8px] font-semibold text-green-600 dark:text-green-400 sm:text-[9px]">Running</span>
                </div>
                <p className="text-[8px] text-light-700 dark:text-dark-700 sm:text-[9px]">Agent fixing bug...</p>
                <p className="mt-0.5 text-[8px] text-brand-500 sm:text-[9px]">Awaiting approval</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center"
              >
                <div className="h-3 w-12 rounded-full bg-light-200 dark:bg-dark-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Connecting Arrow (hidden on mobile 2x2 layout, shown on sm+ row layout) ─── */

function StageArrow({ lit }: { lit: boolean }) {
  return (
    <motion.div
      className="hidden items-center sm:flex"
      animate={{ opacity: lit ? 1 : 0.2 }}
      transition={{ duration: 0.3 }}
    >
      <svg width="28" height="10" viewBox="0 0 28 10" className="text-brand-500">
        <path d="M0 5h22M18 1.5l5 3.5-5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

/* ─── Main Pipeline ─── */

function PipelineAnimation() {
  const [step, setStep] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev >= 3) {
          setCurrentFeedback((f) => (f + 1) % feedbackItems.length);
          return 0;
        }
        return prev + 1;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const feedback = feedbackItems[currentFeedback]!;

  return (
    <div className="relative mx-auto w-full max-w-3xl lg:max-w-4xl">
      {/* Glow behind pipeline */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-pink-500/10 blur-2xl dark:from-brand-500/20 dark:via-purple-500/10 dark:to-pink-500/20" />

      <div className="relative rounded-2xl border border-light-200 bg-light-50/90 p-3 shadow-2xl backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/90 sm:p-5 lg:p-6">
        {/* Window chrome */}
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 rounded-full bg-red-400 sm:h-2.5 sm:w-2.5" />
            <div className="h-2 w-2 rounded-full bg-yellow-400 sm:h-2.5 sm:w-2.5" />
            <div className="h-2 w-2 rounded-full bg-green-400 sm:h-2.5 sm:w-2.5" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-light-200 px-2.5 py-0.5 dark:bg-dark-300 sm:px-3">
            <HiSparkles className="h-2.5 w-2.5 text-brand-500" />
            <span className="text-[8px] font-medium text-light-800 dark:text-dark-800 sm:text-[9px]">Devloops AI Pipeline</span>
          </div>
          <div className="w-10 sm:w-16" />
        </div>

        {/* Mobile: 2×2 grid with center arrows */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <FeedbackStage feedback={feedback} isActive={step === 0} />
          <TriageStage isActive={step >= 1} />
          <TicketStage isActive={step >= 2} />
          <AgentStage isActive={step >= 3} />
        </div>

        {/* Mobile flow arrows (between the 2x2 grid) */}
        <div className="mt-2 flex items-center justify-center gap-3 sm:hidden">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: step > i ? 1 : 0.2 }}
              transition={{ duration: 0.3 }}
            >
              <svg width="20" height="8" viewBox="0 0 20 8" className="text-brand-500">
                <path d="M0 4h14M11 1l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </motion.div>
          ))}
        </div>

        {/* Desktop: single row with arrows between */}
        <div className="hidden items-stretch gap-1.5 sm:flex lg:gap-2">
          <div className="flex-1"><FeedbackStage feedback={feedback} isActive={step === 0} /></div>
          <StageArrow lit={step > 0} />
          <div className="flex-1"><TriageStage isActive={step >= 1} /></div>
          <StageArrow lit={step > 1} />
          <div className="flex-1"><TicketStage isActive={step >= 2} /></div>
          <StageArrow lit={step > 2} />
          <div className="flex-1"><AgentStage isActive={step >= 3} /></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ─── */

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 sm:pt-32">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0">
        <svg className="h-full w-full opacity-[0.35] dark:opacity-[0.15]">
          <pattern id="hero-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="currentColor" className="text-light-600 dark:text-dark-600" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-light-100 dark:to-dark-50" />
      </div>

      {/* Gradient orbs */}
      <div className="pointer-events-none absolute left-1/4 top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-[100px] dark:bg-brand-500/20" />
      <div className="pointer-events-none absolute right-1/4 top-40 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px] dark:bg-purple-500/15" />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-6">
              <HiSparkles className="h-3.5 w-3.5 text-brand-500" />
              <span>AI agents for product teams</span>
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-4xl text-4xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-5xl lg:text-6xl"
          >
            Your team is about to
            <br />
            <span className="gradient-text">get a lot faster.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-xl text-base text-light-900 dark:text-dark-900 sm:text-lg"
          >
            Devloops turns customer feedback into tickets, generates agent-ready prompts,
            and lets AI do the work -- so you ship features while others are still triaging.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button href="https://app.devloops.io/signup" size="lg">
              Start Shipping Faster
            </Button>
            <Button href="#features" variant="secondary" size="lg">
              See how it works
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-4 text-xs text-light-800 dark:text-dark-800"
          >
            Set up in 2 minutes. No credit card required.
          </motion.p>

          {/* Pipeline Animation */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-10 w-full pb-16 sm:mt-14 sm:pb-20"
          >
            <PipelineAnimation />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
