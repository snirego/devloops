import Head from "next/head";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  HiCheck,
  HiClipboard,
  HiArrowRight,
  HiShare,
  HiChatBubbleLeftRight,
} from "react-icons/hi2";
import { FaDiscord, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";
import { twMerge } from "tailwind-merge";

const SHARE_URL = "https://devloops.io";
const SHARE_TEXT =
  "Just joined the Devloops waitlist — AI that turns customer feedback into shipped code. Check it out:";

const PRICING_OPTIONS = [
  { value: "$0 – Just want to try it", label: "$0", sub: "Just want to try it" },
  { value: "$29/mo", label: "$29/mo", sub: "For small teams" },
  { value: "$49/mo", label: "$49/mo", sub: "Fair price for the value" },
  { value: "$99+/mo", label: "$99+/mo", sub: "If it truly delivers" },
];

function fireConfetti() {
  confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 }, colors: ["#6366f1", "#a855f7", "#ec4899", "#22c55e", "#3b82f6"] });
}

/* ─── Feedback form ─── */

function FeedbackCard({ email }: { email: string }) {
  const [pricing, setPricing] = useState("");
  const [comments, setComments] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit() {
    if (!pricing && !comments.trim()) return;
    setState("loading");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pricing, comments }),
      });
      setState("done");
    } catch {
      setState("done");
    }
  }

  if (state === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-green-200 bg-green-50/80 p-6 text-center backdrop-blur-sm dark:border-green-500/20 dark:bg-green-500/5"
      >
        <HiCheck className="mx-auto h-8 w-8 text-green-500" />
        <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">
          Thanks for sharing! This helps us build the right thing.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-light-200 bg-white/80 shadow-lg backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80">
      <div className="border-b border-light-200 px-6 pt-5 pb-4 dark:border-dark-300">
        <div className="flex items-center gap-2">
          <HiChatBubbleLeftRight className="h-5 w-5 text-brand-500" />
          <p className="text-base font-semibold text-light-1000 dark:text-dark-1000">
            One last thing
          </p>
        </div>
        <p className="mt-1 text-sm text-light-700 dark:text-dark-800">
          Optional, but helps us build the right thing.
        </p>
      </div>

      <div className="px-6 py-5">
        {/* Pricing */}
        <p className="text-sm font-medium text-light-1000 dark:text-dark-1000">
          How much would you pay monthly for a tool like this?
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {PRICING_OPTIONS.map((o) => {
            const selected = pricing === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setPricing(o.value)}
                className={twMerge(
                  "flex flex-col rounded-xl border px-4 py-3.5 text-left transition-all",
                  selected
                    ? "border-brand-500 bg-brand-500/8 shadow-sm dark:border-brand-400 dark:bg-brand-500/15"
                    : "border-light-200 bg-white hover:border-light-300 hover:bg-light-50 dark:border-dark-400 dark:bg-dark-100 dark:hover:border-dark-500 dark:hover:bg-dark-200"
                )}
              >
                <span className={twMerge(
                  "text-lg font-bold leading-tight",
                  selected ? "text-brand-600 dark:text-brand-400" : "text-light-1000 dark:text-dark-1000"
                )}>
                  {o.label}
                </span>
                <span className={twMerge(
                  "mt-1 text-sm leading-snug",
                  selected ? "text-brand-500/70 dark:text-brand-400/70" : "text-light-700 dark:text-dark-800"
                )}>
                  {o.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Comments */}
        <p className="mt-5 text-sm font-medium text-light-1000 dark:text-dark-1000">
          Anything else you&apos;d like us to know?
        </p>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="What would make this a must-have for you?"
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-light-200 bg-light-50 px-4 py-3 text-sm text-light-1000 outline-none transition-all placeholder:text-light-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000 dark:placeholder:text-dark-600"
        />

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={state === "loading" || (!pricing && !comments.trim())}
          className="mt-4 w-full rounded-xl bg-[#6366f1] py-3 text-sm font-semibold text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:bg-[#4f46e5] hover:shadow-[#6366f1]/40 disabled:opacity-40"
        >
          {state === "loading" ? "Sending..." : "Send feedback"}
        </button>
      </div>
    </div>
  );
}

/* ─── Share components ─── */

function ShareRow({ href, icon: Icon, label, sub, bg, onClick }: {
  href?: string; icon: React.ComponentType<{ className?: string }>; label: string; sub: string; bg: string; onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: bg }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 text-left">
        <span className="block text-sm font-semibold text-light-1000 dark:text-dark-1000">{label}</span>
        <span className="block text-xs text-light-600 dark:text-dark-600">{sub}</span>
      </span>
      <HiArrowRight className="h-4 w-4 flex-shrink-0 text-light-400 dark:text-dark-500" />
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-xl border border-light-200 bg-white px-4 py-3 transition-all hover:border-light-300 hover:shadow-sm active:scale-[0.98] dark:border-dark-400 dark:bg-dark-100 dark:hover:border-dark-500";
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
}

function ShareCta({ href, icon: Icon, label, bg, onClick }: {
  href?: string; icon: React.ComponentType<{ className?: string }>; label: string; bg: string; onClick?: () => void;
}) {
  const inner = (
    <>
      <Icon className="h-5 w-5" />
      <span className="flex-1 text-start font-semibold">{label}</span>
      <HiArrowRight className="h-4 w-4 opacity-60" />
    </>
  );
  const cls = `flex w-full items-center gap-3 rounded-xl px-5 py-4 text-[15px] text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] ${bg}`;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
}

function CopyLinkRow() {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(SHARE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex w-full items-center gap-3 rounded-xl bg-light-800 px-5 py-4 text-[15px] text-white shadow-md transition-all hover:bg-light-900 hover:shadow-lg active:scale-[0.98] dark:bg-dark-500 dark:hover:bg-dark-600"
    >
      {copied ? <HiCheck className="h-5 w-5" /> : <HiClipboard className="h-5 w-5" />}
      <span className="flex-1 text-start font-semibold">{copied ? "Copied!" : "Copy link"}</span>
      {<HiArrowRight className="h-4 w-4 opacity-60" />}
    </button>
  );
}

/* ─── Page ─── */

export default function SuccessPage() {
  const router = useRouter();
  const email = (router.query.email as string) || "";
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
    fireConfetti();
  }, []);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: "Devloops", text: SHARE_TEXT, url: SHARE_URL });
    } catch { /* cancelled */ }
  }, []);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;

  return (
    <>
      <Head>
        <title>You&apos;re in — Devloops</title>
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-light-100 dark:bg-dark-50">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <svg className="h-full w-full opacity-[0.35] dark:opacity-[0.15]">
            <pattern id="success-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="currentColor" className="text-light-600 dark:text-dark-600" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#success-grid)" />
          </svg>
        </div>
        <div className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-green-500/10 blur-[140px]" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-80 w-80 rounded-full bg-brand-500/10 blur-[120px]" />

        <main className="relative z-10 mx-auto max-w-lg px-5 pb-12 pt-16 sm:pt-20">
          {/* Checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-green-500/25"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <HiCheck className="h-12 w-12 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-center text-4xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-5xl"
          >
            You&apos;re in!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-3 text-center text-lg text-light-800 dark:text-dark-800"
          >
            We&apos;ll email you the moment early access opens.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="mx-auto mt-5 flex items-center justify-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-4 py-2"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-sm font-medium text-light-900 dark:text-dark-900">
              You&apos;re on the list, we&apos;ll be in touch soon
            </span>
          </motion.div>

          {/* Feedback form */}
          {email && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-10"
            >
              <FeedbackCard email={email} />
            </motion.div>
          )}

          {/* Share */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="mt-8 overflow-hidden rounded-2xl border border-light-200 bg-gradient-to-b from-white to-light-50 shadow-lg dark:border-dark-300 dark:from-dark-100 dark:to-dark-200"
          >
            <div className="px-6 pt-6 pb-1 text-center">
              <h2 className="text-lg font-bold text-light-1000 dark:text-dark-1000">
                📢 Help us spread the word
              </h2>
              <p className="mt-1 text-sm text-light-700 dark:text-dark-700">
                Every share gets us closer to launch.
              </p>
            </div>

            <div className="flex flex-col gap-3 p-5">
              {canNativeShare && (
                <ShareCta onClick={handleNativeShare} icon={HiShare} label="Share with a friend" bg="bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600" />
              )}
              <ShareCta href={twitterUrl} icon={FaXTwitter} label="Post on X" bg="bg-black hover:bg-gray-900" />
              <ShareCta href={linkedinUrl} icon={FaLinkedinIn} label="Share on LinkedIn" bg="bg-[#0A66C2] hover:bg-[#004182]" />
              <CopyLinkRow />
            </div>

            {/* Discord — inside same card */}
            <div className="border-t border-light-200 px-6 py-5 text-center dark:border-dark-300">
              <p className="text-sm font-medium text-light-800 dark:text-dark-800">
                Join the community while you wait
              </p>
              <a
                href="https://discord.gg/ZxjnjfqYSZ"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#4752C4] hover:shadow-lg active:scale-[0.97]"
              >
                <FaDiscord className="h-4.5 w-4.5" />
                Join Discord
                <HiArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>

          {/* <motion.a
            href="https://devloops.io"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="mt-8 block text-center text-sm text-light-700 transition-colors hover:text-light-1000 dark:text-dark-700 dark:hover:text-dark-1000"
          >
            &larr; Back to devloops.io
          </motion.a> */}
        </main>
      </div>
    </>
  );
}
