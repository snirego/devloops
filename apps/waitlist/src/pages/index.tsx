import Head from "next/head";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import type { FormEvent, ComponentType } from "react";
import {
  HiSparkles,
  HiArrowRight,
  HiEnvelope,
  HiRocketLaunch,
  HiBolt,
  HiCubeTransparent,
  HiCheck,
} from "react-icons/hi2";
import { SiIntercom, SiSlack, SiZendesk } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { twMerge } from "tailwind-merge";

/* ─── Data ─── */

const ROTATING_WORDS = [
  "feedback",
  "bug reports",
  "feature requests",
  "support tickets",
  "Slack messages",
];

interface FeedbackItem {
  id: number;
  text: string;
  source: string;
  sourceColor: string;
  icon: ComponentType<{ className?: string }>;
}

const feedbackItems: FeedbackItem[] = [
  { id: 1, text: "Login page crashes on mobile", source: "Intercom", sourceColor: "#1f8ded", icon: SiIntercom },
  { id: 2, text: "Need bulk CSV export feature", source: "Slack", sourceColor: "#611f69", icon: SiSlack },
  { id: 3, text: "Checkout flow is confusing", source: "Email", sourceColor: "#ea4335", icon: HiEnvelope },
  { id: 4, text: "API rate limits are too low", source: "Zendesk", sourceColor: "#03363d", icon: SiZendesk },
  { id: 5, text: "Dark mode looks broken", source: "Twitter", sourceColor: "#000000", icon: FaXTwitter },
];

const STEP_MS = 3500;
const ease = [0.25, 0.46, 0.45, 0.94] as const;

/* ─── Rotating text ─── */

function RotatingWord() {
  const [index, setIndex] = useState(0);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);

  const measure = useCallback(() => {
    const el = sizerRef.current;
    if (!el) return;
    const s = window.getComputedStyle(el);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    let max = 0;
    for (const w of ROTATING_WORDS) max = Math.max(max, ctx.measureText(w).width);
    setWidth(Math.ceil(max + 2));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ROTATING_WORDS.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <span ref={sizerRef} aria-hidden className="gradient-text pointer-events-none invisible absolute whitespace-nowrap">
        {ROTATING_WORDS[0]}
      </span>
      <span
        className="relative inline-block overflow-visible pb-[0.25em]"
        style={{ width: width || undefined }}
      >
        <span className="invisible whitespace-nowrap" aria-hidden>Mg</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={ROTATING_WORDS[index]}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease }}
            className="gradient-text absolute inset-0 flex items-center justify-center whitespace-nowrap"
          >
            {ROTATING_WORDS[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </>
  );
}

/* ─── Pipeline Animation (from marketing, self-contained) ─── */

function StageCard({ isActive, activeColor, activeBorder, children }: {
  isActive: boolean; activeColor: string; activeBorder: string; children: React.ReactNode;
}) {
  return (
    <motion.div
      animate={{
        flexGrow: isActive ? 2.2 : 1,
        backgroundColor: isActive ? activeColor : "rgba(128,128,128,0.06)",
        boxShadow: isActive
          ? `inset 0 0 0 1px ${activeBorder}, 0 4px 20px rgba(0,0,0,0.08)`
          : "inset 0 0 0 1px transparent, 0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.45, ease }}
      style={{ flexBasis: 0, minWidth: 0 }}
      className="relative flex h-[100px] flex-col overflow-hidden rounded-xl p-2.5 sm:h-[120px] sm:p-3 lg:h-[150px] lg:rounded-2xl lg:p-4"
    >
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="bar"
            className="absolute bottom-0 left-0 h-[2px] rounded-full"
            style={{ background: `linear-gradient(90deg, ${activeBorder}, ${activeBorder.replace(/[\d.]+\)$/, "0.6)")})` }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            exit={{ width: "100%", opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: STEP_MS / 1000, ease: "linear" }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StageHeader({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="mb-1.5 flex flex-shrink-0 items-center gap-1.5 sm:mb-2 lg:mb-2.5">
      <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full sm:h-2 sm:w-2 lg:h-2.5 lg:w-2.5 ${pulse ? "animate-pulse" : ""}`} style={{ backgroundColor: color }} />
      <span className="truncate text-[7px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700 sm:text-[9px] lg:text-[11px]">{label}</span>
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

function Idle() {
  return <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="flex items-center justify-center"><div className="h-2.5 w-10 rounded-full bg-light-200 dark:bg-dark-400 lg:h-3 lg:w-14" /></motion.div>;
}

function Done({ text }: { text: string }) {
  return (
    <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 lg:gap-2">
      <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15 sm:h-4 sm:w-4 lg:h-5 lg:w-5"><HiCheck className="h-2 w-2 text-green-500 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" /></span>
      <span className="truncate text-[8px] text-light-700 dark:text-dark-700 sm:text-[10px] lg:text-xs">{text}</span>
    </motion.div>
  );
}

function FeedbackStage({ fb, active }: { fb: FeedbackItem; active: boolean }) {
  const Icon = fb.icon;
  return (
    <StageCard isActive={active} activeColor="rgba(99,102,241,0.08)" activeBorder="rgba(99,102,241,0.25)">
      <StageHeader color="#3b82f6" label="Feedback" />
      <InnerCard>
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key={`fb-${fb.id}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="flex items-start gap-2 lg:gap-2.5">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7 lg:h-8 lg:w-8 lg:rounded-lg" style={{ backgroundColor: fb.sourceColor }}>
                <Icon className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-semibold text-light-1000 dark:text-dark-1000 sm:text-[10px] lg:text-[13px]">{fb.source}</p>
                <p className="mt-0.5 truncate text-[7px] leading-snug text-light-600 dark:text-dark-600 sm:text-[9px] lg:text-[11px]">{fb.text}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 lg:gap-2">
              <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15 sm:h-4 sm:w-4 lg:h-5 lg:w-5"><HiCheck className="h-2 w-2 text-green-500 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" /></span>
              <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded sm:h-5 sm:w-5 lg:rounded-md" style={{ backgroundColor: fb.sourceColor }}>
                <Icon className="h-2 w-2 text-white sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
              </div>
              <span className="truncate text-[8px] text-light-700 dark:text-dark-700 sm:text-[10px] lg:text-xs">{fb.source}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

function AnalysisStage({ active, revealed }: { active: boolean; revealed: boolean }) {
  return (
    <StageCard isActive={active} activeColor="rgba(168,85,247,0.08)" activeBorder="rgba(168,85,247,0.25)">
      <StageHeader color="#a855f7" label="AI Analysis" />
      <InnerCard>
        <AnimatePresence mode="wait">
          {revealed ? (active ? (
            <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-1.5 flex items-center gap-1 lg:mb-2"><HiSparkles className="h-2.5 w-2.5 text-purple-500 sm:h-3 sm:w-3 lg:h-4 lg:w-4" /><span className="text-[8px] font-semibold text-purple-600 dark:text-purple-400 sm:text-[10px] lg:text-[13px]">Analyzing...</span></div>
              <div className="space-y-1 lg:space-y-1.5">
                <div className="flex items-center justify-between gap-2"><span className="text-[7px] text-light-700 dark:text-dark-700 sm:text-[9px] lg:text-[11px]">Type</span><span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[6px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400 sm:text-[8px] lg:px-2 lg:text-[10px]">Bug</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-[7px] text-light-700 dark:text-dark-700 sm:text-[9px] lg:text-[11px]">Priority</span><span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[6px] font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 sm:text-[8px] lg:px-2 lg:text-[10px]">High</span></div>
              </div>
            </motion.div>
          ) : <Done text="Bug · High" />) : <Idle />}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

function TicketStage({ active, revealed }: { active: boolean; revealed: boolean }) {
  return (
    <StageCard isActive={active} activeColor="rgba(34,197,94,0.08)" activeBorder="rgba(34,197,94,0.25)">
      <StageHeader color="#22c55e" label="Ticket" />
      <InnerCard>
        <AnimatePresence mode="wait">
          {revealed ? (active ? (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[8px] font-semibold text-light-1000 dark:text-dark-1000 sm:text-[10px] lg:text-[13px]">BUG-347</p>
              <p className="mt-0.5 text-[7px] text-light-600 dark:text-dark-600 sm:text-[9px] lg:text-[11px]">Auto-generated prompt</p>
              <div className="mt-1 rounded bg-light-100 px-1.5 py-0.5 dark:bg-dark-200 lg:mt-1.5 lg:rounded-md lg:px-2 lg:py-1">
                <p className="truncate font-mono text-[7px] text-brand-600 dark:text-brand-400 sm:text-[9px] lg:text-[11px]">Fix mobile crash on login...</p>
              </div>
            </motion.div>
          ) : <Done text="BUG-347" />) : <Idle />}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

function AgentStage({ active, revealed }: { active: boolean; revealed: boolean }) {
  return (
    <StageCard isActive={active} activeColor="rgba(99,102,241,0.08)" activeBorder="rgba(99,102,241,0.25)">
      <StageHeader color={revealed ? "#6366f1" : "#a5b4fc"} label="Agent" pulse={active} />
      <InnerCard>
        <AnimatePresence mode="wait">
          {revealed ? (active ? (
            <motion.div key="ag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-0.5 flex items-center gap-1.5 lg:mb-1 lg:gap-2">
                <span className="relative flex h-1.5 w-1.5 lg:h-2 lg:w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500 lg:h-2 lg:w-2" /></span>
                <span className="text-[8px] font-semibold text-green-600 dark:text-green-400 sm:text-[10px] lg:text-[13px]">Running</span>
              </div>
              <p className="text-[7px] text-light-600 dark:text-dark-600 sm:text-[9px] lg:text-[11px]">Fixing bug...</p>
              <p className="mt-0.5 text-[7px] font-medium text-brand-500 sm:text-[9px] lg:text-[11px]">Awaiting approval</p>
            </motion.div>
          ) : <Done text="Shipped" />) : <Idle />}
        </AnimatePresence>
      </InnerCard>
    </StageCard>
  );
}

function StageArrow({ lit }: { lit: boolean }) {
  return (
    <motion.div className="hidden flex-shrink-0 items-center sm:flex" animate={{ opacity: lit ? 1 : 0.15 }} transition={{ duration: 0.3 }}>
      <svg width="24" height="10" viewBox="0 0 24 10" className="text-brand-500 sm:h-2.5 sm:w-5 lg:h-3 lg:w-6">
        <path d="M0 5h18M14 1.5l5 3.5-5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

function PipelineAnimation() {
  const [step, setStep] = useState(0);
  const [fbIdx, setFbIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((p) => {
        if (p >= 3) { setFbIdx((f) => (f + 1) % feedbackItems.length); return 0; }
        return p + 1;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const fb = feedbackItems[fbIdx]!;

  return (
    <div className="relative mx-auto w-full max-w-3xl lg:max-w-4xl">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-pink-500/10 blur-2xl dark:from-brand-500/20 dark:via-purple-500/10 dark:to-pink-500/20" />
      <div className="relative overflow-hidden rounded-2xl border border-light-200 bg-light-50/90 p-3 shadow-2xl backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/90 sm:p-5 lg:rounded-3xl lg:p-7">
        <div className="mb-3 flex items-center justify-between sm:mb-4 lg:mb-5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 rounded-full bg-red-400 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
            <div className="h-2 w-2 rounded-full bg-yellow-400 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
            <div className="h-2 w-2 rounded-full bg-green-400 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-light-200 px-2.5 py-0.5 dark:bg-dark-300 sm:px-3 lg:gap-2 lg:px-4 lg:py-1">
            <HiSparkles className="h-2.5 w-2.5 text-brand-500 lg:h-3.5 lg:w-3.5" />
            <span className="text-[8px] font-medium text-light-800 dark:text-dark-800 sm:text-[10px] lg:text-xs">Devloops AI Pipeline</span>
          </div>
          <div className="w-10 sm:w-16" />
        </div>
        {/* Mobile 2x2 */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <FeedbackStage fb={fb} active={step === 0} />
          <AnalysisStage active={step === 1} revealed={step >= 1} />
          <TicketStage active={step === 2} revealed={step >= 2} />
          <AgentStage active={step === 3} revealed={step >= 3} />
        </div>
        {/* Desktop row */}
        <div className="hidden items-stretch gap-1.5 sm:flex lg:gap-2">
          <FeedbackStage fb={fb} active={step === 0} />
          <StageArrow lit={step > 0} />
          <AnalysisStage active={step === 1} revealed={step >= 1} />
          <StageArrow lit={step > 1} />
          <TicketStage active={step === 2} revealed={step >= 2} />
          <StageArrow lit={step > 2} />
          <AgentStage active={step === 3} revealed={step >= 3} />
        </div>
      </div>
    </div>
  );
}

/* ─── Pain points (visual, from marketing ProblemStrip) ─── */

const painPoints = [
  {
    icon: HiEnvelope,
    before: "Hours analyzing feedback manually",
    after: "AI auto-analyzes in seconds",
    color: "#f43f5e",
  },
  {
    icon: HiBolt,
    before: "Critical bugs buried in Slack threads",
    after: "Feedback becomes tickets automatically",
    color: "#f59e0b",
  },
  {
    icon: HiCubeTransparent,
    before: "Endless PM → Dev → PM ping pong",
    after: "AI generates agent-ready prompts",
    color: "#8b5cf6",
  },
  {
    icon: HiRocketLaunch,
    before: "Weeks from report to shipped fix",
    after: "Agents work 24/7, you just approve",
    color: "#10b981",
  },
];

/* ─── Waitlist form ─── */

const INTEREST_OPTIONS = [
  { value: "notify", label: "Just notify me when it\u2019s ready", icon: HiEnvelope },
  { value: "meet", label: "I\u2019d love to meet & share what I need", icon: HiSparkles },
] as const;

function WaitlistForm({ large }: { large?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<string>("notify");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interest }),
      });
      if (res.ok) router.push(`/success?email=${encodeURIComponent(email)}`);
      else { setState("error"); setTimeout(() => setState("idle"), 3000); }
    } catch {
      setState("error"); setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-light-300 bg-white shadow-lg shadow-black/5 dark:border-dark-400 dark:bg-dark-100 dark:shadow-black/20">
        {/* Interest picker */}
        <div className="flex flex-col border-b border-light-200 dark:border-dark-300">
          {INTEREST_OPTIONS.map((o, i) => {
            const Icon = o.icon;
            const selected = interest === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setInterest(o.value)}
                className={twMerge(
                  "flex items-center gap-3 px-4 py-3 text-left text-[13px] font-medium transition-all",
                  i < INTEREST_OPTIONS.length - 1 && "border-b border-light-100 dark:border-dark-300/50",
                  selected
                    ? "bg-brand-500/5 text-light-1000 dark:bg-brand-500/10 dark:text-dark-1000"
                    : "text-light-600 hover:bg-light-50 dark:text-dark-600 dark:hover:bg-dark-200"
                )}
              >
                <span className={twMerge(
                  "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  selected
                    ? "border-brand-500"
                    : "border-light-400 dark:border-dark-500"
                )}>
                  {selected && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                </span>
                <Icon className={twMerge("h-4 w-4 flex-shrink-0", selected ? "text-brand-500" : "text-light-400 dark:text-dark-500")} />
                <span className="leading-snug">{o.label}</span>
              </button>
            );
          })}
        </div>

        {/* Email + submit */}
        <div className={twMerge("relative", large ? "h-16" : "h-14")}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-full w-full border-0 bg-transparent pl-5 pr-36 text-base text-light-1000 outline-none placeholder:text-light-500 dark:text-dark-1000 dark:placeholder:text-dark-600 sm:pr-44"
          />
          <button
            type="submit"
            disabled={state === "loading"}
            className={twMerge(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#6366f1] text-sm font-semibold text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:bg-[#4f46e5] hover:shadow-[#6366f1]/40 disabled:opacity-60",
              large ? "px-6 py-3 sm:px-7" : "px-5 py-2.5 sm:px-6"
            )}
          >
            {state === "loading" ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <span className="flex items-center gap-1.5">Get early access<HiArrowRight className="h-4 w-4" /></span>
            )}
          </button>
        </div>
      </div>
      {state === "error" && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-sm text-red-500">
          Something went wrong. Try again.
        </motion.p>
      )}
    </form>
  );
}

/* ─── Page ─── */

export default function WaitlistPage() {
  return (
    <>
      <Head>
        <title>Devloops — AI agents that turn feedback into shipped code</title>
        <meta name="description" content="Stop writing specs. Devloops reads your customer feedback, creates agent-ready tickets, and ships the code — automatically." />
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-light-100 dark:bg-dark-50">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <svg className="h-full w-full opacity-[0.35] dark:opacity-[0.15]">
            <pattern id="wl-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="currentColor" className="text-light-600 dark:text-dark-600" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#wl-grid)" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-light-100 dark:to-dark-50" />
        </div>
        <div className="pointer-events-none absolute left-1/4 top-20 h-96 w-96 rounded-full bg-brand-500/8 blur-[120px] dark:bg-brand-500/15" />
        <div className="pointer-events-none absolute right-1/4 top-40 h-80 w-80 rounded-full bg-purple-500/8 blur-[120px] dark:bg-purple-500/12" />

        {/* Nav — logo only */}
        <header className="relative z-10">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
            <span className="text-lg font-bold tracking-tight text-light-1000 dark:text-dark-1000">Devloops</span>
          </div>
        </header>

        <main className="relative z-10">
          {/* ─── HERO ─── */}
          <section className="mx-auto max-w-6xl px-5 pb-8 pt-8 sm:pt-14 lg:pt-16">
            <div className="flex flex-col items-center text-center">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-500">
                  <HiBolt className="h-3.5 w-3.5" />
                  Early access — limited spots
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-7 max-w-4xl text-4xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-5xl lg:text-6xl"
              >
                Your team is about to
                <br />
                <span className="gradient-text">get a lot faster.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-5 max-w-xl text-base leading-relaxed text-light-900 dark:text-dark-900 sm:text-lg"
              >
                Devloops turns customer feedback into tickets, generates agent-ready prompts,
                and lets AI do the work — so you ship features while others are still analyzing.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 flex w-full flex-col items-center gap-3"
              >
                <WaitlistForm large />
                <p className="text-xs text-light-600 dark:text-dark-600">Free during early access. No spam. Just one email when it&apos;s your turn.</p>
              </motion.div>
            </div>
          </section>

          {/* ─── PIPELINE VISUAL ─── */}
          <section className="px-5 pb-20 pt-8 sm:pb-24 sm:pt-12">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease }}
            >
              <PipelineAnimation />
            </motion.div>
          </section>

          {/* ─── TURN FEEDBACK INTO CODE ─── */}
          <section className="relative py-20 sm:py-24">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-500/5 via-purple-500/5 to-pink-500/5 blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-3xl px-5 text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <h2 className="relative max-w-4xl overflow-visible text-3xl font-extrabold leading-[1.3] tracking-tight text-light-1000 dark:text-dark-1000 sm:text-4xl lg:text-5xl">
                  Turn
                  <br />
                  <RotatingWord />
                  <br />
                  into shipped code.
                </h2>
                <p className="mt-5 max-w-xl mx-auto text-lg leading-relaxed text-light-800 dark:text-dark-800">
                  Your AI agents can code. They just need someone to tell them{" "}
                  <em className="not-italic text-light-1000 dark:text-dark-1000">what</em> to build.{" "}
                  <strong className="font-semibold text-light-1000 dark:text-dark-1000">Devloops is that someone.</strong>
                </p>
              </motion.div>
            </div>
          </section>

          {/* ─── BEFORE / AFTER (visual pain points) ─── */}
          <section className="relative py-20 sm:py-24">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500/5 to-brand-500/5 blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-6xl px-5">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-14 text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-4xl">
                  Your team is fast.<br /><span className="gradient-text">Your process is the bottleneck.</span>
                </h2>
              </motion.div>

              <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
                {painPoints.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08, duration: 0.45, ease }}
                      className="relative overflow-hidden rounded-2xl border border-light-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80"
                    >
                      <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl" style={{ backgroundColor: p.color }} />
                      <div className="pl-4">
                        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: p.color + "18" }}>
                          <Icon className="h-5 w-5" style={{ color: p.color }} />
                        </div>
                        <p className="text-base font-medium text-light-700 line-through decoration-1 decoration-light-400/50 dark:text-dark-500 dark:decoration-dark-500/40">
                          {p.before}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-light-1000 dark:text-dark-1000 sm:text-base">
                          {p.after}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ─── FINAL CTA ─── */}
          <section className="relative overflow-hidden py-20 sm:py-28">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-light-100 via-light-50 to-light-100 dark:from-dark-50 dark:via-dark-100 dark:to-dark-50" />
            <div className="pointer-events-none absolute left-1/3 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/5 blur-[120px] dark:bg-brand-500/10" />

            <div className="relative mx-auto max-w-2xl px-5 text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <h2 className="text-3xl font-extrabold text-light-1000 dark:text-dark-1000 sm:text-4xl">
                  Your users already know<br /><span className="gradient-text">what you should build next.</span>
                </h2>
                <p className="mt-5 text-lg text-light-800 dark:text-dark-800">
                  Let Devloops listen, prioritize, and ship it — automatically.
                </p>
                <div className="mt-10 flex justify-center"><WaitlistForm /></div>
                <p className="mt-4 text-xs text-light-600 dark:text-dark-600">No spam, ever. Just one email when it&apos;s your turn.</p>
              </motion.div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-light-200 dark:border-dark-300">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row">
            <p className="text-xs text-light-700 dark:text-dark-700">&copy; {new Date().getFullYear()} Devloops</p>
            <div className="flex items-center gap-4">
              <a href="https://discord.gg/ZxjnjfqYSZ" target="_blank" rel="noopener noreferrer" className="text-xs text-light-800 transition-colors hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000">Discord</a>
              <a href="mailto:support@devloops.io" className="text-xs text-light-800 transition-colors hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
