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

function PipelineAnimation() {
  const [step, setStep] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState(0);

  // Cycle through: 0=feedback arrives, 1=AI processes, 2=ticket created, 3=agent runs
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
    <div className="relative mx-auto w-full max-w-2xl">
      {/* Glow behind pipeline */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-pink-500/10 blur-2xl dark:from-brand-500/20 dark:via-purple-500/10 dark:to-pink-500/20" />

      <div className="relative rounded-2xl border border-light-200 bg-light-50/90 p-4 shadow-2xl backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/90 sm:p-6">
        {/* Window chrome */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-light-200 px-3 py-0.5 dark:bg-dark-300">
            <HiSparkles className="h-2.5 w-2.5 text-brand-500" />
            <span className="text-[9px] font-medium text-light-800 dark:text-dark-800">Devloops AI Pipeline</span>
          </div>
          <div className="w-16" />
        </div>

        {/* Pipeline stages */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {/* Stage 1: Feedback In */}
          <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 ${step === 0 ? "bg-brand-50/60 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
            <div className="mb-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700">Feedback</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100"
              >
                <div className="mb-1 flex items-center gap-1">
                  <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white" style={{ backgroundColor: feedback.sourceColor }}>{feedback.source}</span>
                </div>
                <p className="text-[9px] leading-snug text-light-900 dark:text-dark-900">{feedback.text}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stage 2: AI Processing */}
          <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 ${step === 1 ? "bg-purple-50/60 ring-1 ring-purple-200 dark:bg-purple-500/10 dark:ring-purple-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
            <div className="mb-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700">AI Triage</span>
            </div>
            <div className="rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100">
              {step >= 1 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="mb-1.5 flex items-center gap-1">
                    <HiSparkles className="h-2.5 w-2.5 text-purple-500" />
                    <span className="text-[8px] font-semibold text-purple-600 dark:text-purple-400">Analyzing...</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-light-700 dark:text-dark-700">Type</span>
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[7px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">Bug</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-light-700 dark:text-dark-700">Priority</span>
                      <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[7px] font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">High</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex h-12 items-center justify-center">
                  <div className="h-3 w-12 rounded-full bg-light-200 dark:bg-dark-400" />
                </div>
              )}
            </div>
          </div>

          {/* Stage 3: Ticket + Prompt */}
          <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 ${step === 2 ? "bg-green-50/60 ring-1 ring-green-200 dark:bg-green-500/10 dark:ring-green-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
            <div className="mb-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700">Ticket</span>
            </div>
            <div className="rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100">
              {step >= 2 ? (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <p className="text-[9px] font-semibold text-light-1000 dark:text-dark-1000">BUG-347</p>
                  <p className="mt-0.5 text-[8px] text-light-700 dark:text-dark-700">Auto-generated prompt</p>
                  <div className="mt-1.5 rounded-md bg-light-100 p-1 dark:bg-dark-200">
                    <p className="text-[7px] font-mono text-brand-600 dark:text-brand-400">Fix mobile crash on login view...</p>
                  </div>
                </motion.div>
              ) : (
                <div className="flex h-12 items-center justify-center">
                  <div className="h-3 w-12 rounded-full bg-light-200 dark:bg-dark-400" />
                </div>
              )}
            </div>
          </div>

          {/* Stage 4: Agent Running */}
          <div className={`rounded-xl p-2.5 transition-all duration-500 sm:p-3 ${step === 3 ? "bg-brand-50/60 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/20" : "bg-light-100 dark:bg-dark-200/50"}`}>
            <div className="mb-2 flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${step === 3 ? "animate-pulse bg-brand-500" : "bg-brand-300"}`} />
              <span className="text-[8px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700">Agent</span>
            </div>
            <div className="rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100">
              {step >= 3 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                  <div className="mb-1 flex items-center gap-1">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                    </span>
                    <span className="text-[8px] font-semibold text-green-600 dark:text-green-400">Running</span>
                  </div>
                  <p className="text-[8px] text-light-700 dark:text-dark-700">Agent fixing bug...</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[8px] text-light-700 dark:text-dark-700">Awaiting approval</span>
                  </div>
                </motion.div>
              ) : (
                <div className="flex h-12 items-center justify-center">
                  <div className="h-3 w-12 rounded-full bg-light-200 dark:bg-dark-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connection arrows between stages */}
        <div className="mt-2 flex items-center justify-around px-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="flex items-center"
              animate={{ opacity: step > i ? 1 : 0.2 }}
              transition={{ duration: 0.3 }}
            >
              <svg width="24" height="8" viewBox="0 0 24 8" className="text-brand-500">
                <path d="M0 4h20M16 1l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </motion.div>
          ))}
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
            className="mt-12 w-full pb-20 sm:mt-16"
          >
            <PipelineAnimation />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
