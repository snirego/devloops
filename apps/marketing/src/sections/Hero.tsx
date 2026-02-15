import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { HiSparkles, HiCheck, HiEnvelope } from "react-icons/hi2";
import { SiIntercom, SiSlack, SiZendesk } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";

import Button from "~/components/Button";
import Badge from "~/components/Badge";

/* ─── Data ─── */

interface FeedbackItem {
  id: number;
  text: string;
  source: string;
  sourceColor: string;
  icon: IconType;
}

const feedbackItems: FeedbackItem[] = [
  { id: 1, text: "Login page crashes on mobile", source: "Intercom", sourceColor: "#1f8ded", icon: SiIntercom },
  { id: 2, text: "Need bulk CSV export feature", source: "Slack", sourceColor: "#611f69", icon: SiSlack },
  { id: 3, text: "Checkout flow is confusing", source: "Email", sourceColor: "#ea4335", icon: HiEnvelope },
  { id: 4, text: "API rate limits are too low", source: "Zendesk", sourceColor: "#03363d", icon: SiZendesk },
  { id: 5, text: "Dark mode looks broken", source: "Twitter", sourceColor: "#000000", icon: FaXTwitter },
];

/* ─── Shared animation config ─── */

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const dur = 0.45;

/* ─── Stage Card wrapper ─── */

function StageCard({
  isActive,
  activeColor,
  activeBorder,
  children,
}: {
  isActive: boolean;
  activeColor: string;
  activeBorder: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      animate={{
        flexGrow: isActive ? 2.2 : 1,
        backgroundColor: isActive ? activeColor : "rgba(128,128,128,0.06)",
        boxShadow: isActive
          ? `inset 0 0 0 1px ${activeBorder}, 0 4px 20px rgba(0,0,0,0.08)`
          : "inset 0 0 0 1px transparent, 0 0px 0px rgba(0,0,0,0)",
      }}
      transition={{ duration: dur, ease }}
      style={{ flexBasis: 0, minWidth: 0 }}
      className="flex h-[100px] flex-col overflow-hidden rounded-xl p-2.5 sm:h-[120px] sm:p-3 lg:h-[150px] lg:rounded-2xl lg:p-4"
    >
      {children}
    </motion.div>
  );
}

/* ─── Small shared components ─── */

function StageHeader({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="mb-1.5 flex flex-shrink-0 items-center gap-1.5 sm:mb-2 lg:mb-2.5 lg:gap-2">
      <div
        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full sm:h-2 sm:w-2 lg:h-2.5 lg:w-2.5 ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: color }}
      />
      <span className="truncate text-[7px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700 sm:text-[9px] lg:text-[11px]">
        {label}
      </span>
    </div>
  );
}

function InnerCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-lg border border-light-200 bg-white px-2.5 py-2 dark:border-dark-300 dark:bg-dark-100 sm:px-3 sm:py-2.5 lg:rounded-xl lg:px-4 lg:py-3">
      {children}
    </div>
  );
}

function IdlePlaceholder() {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-center"
    >
      <div className="h-2.5 w-10 rounded-full bg-light-200 dark:bg-dark-400 lg:h-3 lg:w-14" />
    </motion.div>
  );
}

/** Compact "done" chip shown in passed cards -- single line, never wraps */
function DoneChip({ text }: { text: string }) {
  return (
    <motion.div
      key="done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-1.5 lg:gap-2"
    >
      <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15 sm:h-4 sm:w-4 lg:h-5 lg:w-5">
        <HiCheck className="h-2 w-2 text-green-500 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
      </span>
      <span className="truncate text-[8px] text-light-700 dark:text-dark-700 sm:text-[10px] lg:text-xs">
        {text}
      </span>
    </motion.div>
  );
}

/* ─── 4 Stage content components ─── */

function FeedbackStage({ feedback, isActive }: { feedback: FeedbackItem; isActive: boolean }) {
  const Icon = feedback.icon;
  return (
    <StageCard isActive={isActive} activeColor="rgba(99,102,241,0.08)" activeBorder="rgba(99,102,241,0.25)">
      <StageHeader color="#3b82f6" label="Feedback" />
      <InnerCard>
        <AnimatePresence mode="wait">
          {isActive ? (
            <motion.div
              key={`fb-${feedback.id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 lg:gap-2.5"
            >
              {/* Platform icon */}
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7 lg:h-8 lg:w-8 lg:rounded-lg"
                style={{ backgroundColor: feedback.sourceColor }}
              >
                <Icon className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-semibold text-light-1000 dark:text-dark-1000 sm:text-[10px] lg:text-[13px]">
                  {feedback.source}
                </p>
                <p className="mt-0.5 truncate text-[7px] leading-snug text-light-600 dark:text-dark-600 sm:text-[9px] lg:text-[11px]">
                  {feedback.text}
                </p>
              </div>
            </motion.div>
          ) : (
            /* Done state: green check circle on left, then platform icon + name */
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 lg:gap-2"
            >
              <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15 sm:h-4 sm:w-4 lg:h-5 lg:w-5">
                <HiCheck className="h-2 w-2 text-green-500 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
              </span>
              <div
                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded sm:h-4.5 sm:w-4.5 lg:h-5 lg:w-5 lg:rounded-md"
                style={{ backgroundColor: feedback.sourceColor }}
              >
                <Icon className="h-2 w-2 text-white sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
              </div>
              <span className="truncate text-[8px] text-light-700 dark:text-dark-700 sm:text-[10px] lg:text-xs">
                {feedback.source}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

function AnalysisStage({ isActive, isRevealed }: { isActive: boolean; isRevealed: boolean }) {
  return (
    <StageCard isActive={isActive} activeColor="rgba(168,85,247,0.08)" activeBorder="rgba(168,85,247,0.25)">
      <StageHeader color="#a855f7" label="AI Analysis" />
      <InnerCard>
        <AnimatePresence mode="wait">
          {isRevealed ? (
            isActive ? (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="mb-1.5 flex items-center gap-1 lg:mb-2 lg:gap-1.5">
                  <HiSparkles className="h-2.5 w-2.5 flex-shrink-0 text-purple-500 sm:h-3 sm:w-3 lg:h-4 lg:w-4" />
                  <span className="text-[8px] font-semibold text-purple-600 dark:text-purple-400 sm:text-[10px] lg:text-[13px]">
                    Analyzing...
                  </span>
                </div>
                <div className="space-y-1 lg:space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[7px] text-light-700 dark:text-dark-700 sm:text-[9px] lg:text-[11px]">Type</span>
                    <span className="flex-shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[6px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400 sm:text-[8px] lg:px-2 lg:text-[10px]">
                      Bug
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[7px] text-light-700 dark:text-dark-700 sm:text-[9px] lg:text-[11px]">Priority</span>
                    <span className="flex-shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[6px] font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 sm:text-[8px] lg:px-2 lg:text-[10px]">
                      High
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <DoneChip text="Bug · High" />
            )
          ) : (
            <IdlePlaceholder />
          )}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

function TicketStage({ isActive, isRevealed }: { isActive: boolean; isRevealed: boolean }) {
  return (
    <StageCard isActive={isActive} activeColor="rgba(34,197,94,0.08)" activeBorder="rgba(34,197,94,0.25)">
      <StageHeader color="#22c55e" label="Ticket" />
      <InnerCard>
        <AnimatePresence mode="wait">
          {isRevealed ? (
            isActive ? (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <p className="text-[8px] font-semibold text-light-1000 dark:text-dark-1000 sm:text-[10px] lg:text-[13px]">BUG-347</p>
                <p className="mt-0.5 text-[7px] text-light-600 dark:text-dark-600 sm:text-[9px] lg:text-[11px]">Auto-generated prompt</p>
                <div className="mt-1 rounded bg-light-100 px-1.5 py-0.5 dark:bg-dark-200 lg:mt-1.5 lg:rounded-md lg:px-2 lg:py-1">
                  <p className="truncate text-[7px] font-mono text-brand-600 dark:text-brand-400 sm:text-[9px] lg:text-[11px]">
                    Fix mobile crash on login...
                  </p>
                </div>
              </motion.div>
            ) : (
              <DoneChip text="BUG-347" />
            )
          ) : (
            <IdlePlaceholder />
          )}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

function AgentStage({ isActive, isRevealed }: { isActive: boolean; isRevealed: boolean }) {
  return (
    <StageCard isActive={isActive} activeColor="rgba(99,102,241,0.08)" activeBorder="rgba(99,102,241,0.25)">
      <StageHeader color={isRevealed ? "#6366f1" : "#a5b4fc"} label="Agent" pulse={isActive} />
      <InnerCard>
        <AnimatePresence mode="wait">
          {isRevealed ? (
            isActive ? (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="mb-0.5 flex items-center gap-1.5 lg:mb-1 lg:gap-2">
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0 sm:h-1.5 sm:w-1.5 lg:h-2 lg:w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500 sm:h-1.5 sm:w-1.5 lg:h-2 lg:w-2" />
                  </span>
                  <span className="text-[8px] font-semibold text-green-600 dark:text-green-400 sm:text-[10px] lg:text-[13px]">Running</span>
                </div>
                <p className="text-[7px] text-light-600 dark:text-dark-600 sm:text-[9px] lg:text-[11px]">Fixing bug...</p>
                <p className="mt-0.5 text-[7px] font-medium text-brand-500 sm:text-[9px] lg:text-[11px]">Awaiting approval</p>
              </motion.div>
            ) : (
              <DoneChip text="Shipped" />
            )
          ) : (
            <IdlePlaceholder />
          )}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

/* ─── Connecting Arrow ─── */

function StageArrow({ lit }: { lit: boolean }) {
  return (
    <motion.div
      className="hidden flex-shrink-0 items-center sm:flex"
      animate={{ opacity: lit ? 1 : 0.15 }}
      transition={{ duration: 0.3 }}
    >
      <svg width="24" height="10" viewBox="0 0 24 10" className="text-brand-500 sm:h-2.5 sm:w-5 lg:h-3 lg:w-6">
        <path d="M0 5h18M14 1.5l5 3.5-5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
      {/* Glow */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-pink-500/10 blur-2xl dark:from-brand-500/20 dark:via-purple-500/10 dark:to-pink-500/20" />

      <div className="relative overflow-hidden rounded-2xl border border-light-200 bg-light-50/90 p-3 shadow-2xl backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/90 sm:p-5 lg:rounded-3xl lg:p-7">
        {/* Window chrome */}
        <div className="mb-3 flex items-center justify-between sm:mb-4 lg:mb-5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 rounded-full bg-red-400 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
            <div className="h-2 w-2 rounded-full bg-yellow-400 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
            <div className="h-2 w-2 rounded-full bg-green-400 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-light-200 px-2.5 py-0.5 dark:bg-dark-300 sm:px-3 lg:gap-2 lg:px-4 lg:py-1">
            <HiSparkles className="h-2.5 w-2.5 text-brand-500 lg:h-3.5 lg:w-3.5" />
            <span className="text-[8px] font-medium text-light-800 dark:text-dark-800 sm:text-[10px] lg:text-xs">
              Devloops AI Pipeline
            </span>
          </div>
          <div className="w-10 sm:w-16" />
        </div>

        {/* Mobile: 2×2 grid */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <FeedbackStage feedback={feedback} isActive={step === 0} />
          <AnalysisStage isActive={step === 1} isRevealed={step >= 1} />
          <TicketStage isActive={step === 2} isRevealed={step >= 2} />
          <AgentStage isActive={step === 3} isRevealed={step >= 3} />
        </div>

        {/* Mobile flow arrows */}
        <div className="mt-2 flex items-center justify-center gap-3 sm:hidden">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} animate={{ opacity: step > i ? 1 : 0.15 }} transition={{ duration: 0.3 }}>
              <svg width="20" height="8" viewBox="0 0 20 8" className="text-brand-500">
                <path d="M0 4h14M11 1l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </motion.div>
          ))}
        </div>

        {/* Desktop: flex row -- active card animates wider */}
        <div className="hidden items-stretch gap-1.5 sm:flex lg:gap-2">
          <FeedbackStage feedback={feedback} isActive={step === 0} />
          <StageArrow lit={step > 0} />
          <AnalysisStage isActive={step === 1} isRevealed={step >= 1} />
          <StageArrow lit={step > 1} />
          <TicketStage isActive={step === 2} isRevealed={step >= 2} />
          <StageArrow lit={step > 2} />
          <AgentStage isActive={step === 3} isRevealed={step >= 3} />
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
            and lets AI do the work -- so you ship features while others are still analyzing.
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
