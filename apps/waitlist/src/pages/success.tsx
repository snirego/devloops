import Head from "next/head";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  HiCheck,
  HiClipboard,
  HiArrowRight,
  HiShare,
} from "react-icons/hi2";
import { FaDiscord, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";

const SHARE_URL = "https://devloops.io";
const SHARE_TEXT =
  "Just joined the Devloops waitlist — AI that turns customer feedback into shipped code. Check it out:";

function fireConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#6366f1", "#a855f7", "#ec4899", "#22c55e", "#3b82f6"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#6366f1", "#a855f7", "#ec4899", "#22c55e", "#3b82f6"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };

  // Initial big burst
  confetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#6366f1", "#a855f7", "#ec4899", "#22c55e", "#3b82f6"],
  });

  frame();
}

function ShareButton({
  href,
  icon: Icon,
  label,
  className,
  onClick,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <Icon className="h-4 w-4" />
      {label}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] ${className}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] ${className}`}
    >
      {inner}
    </a>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(SHARE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2.5 rounded-xl border border-light-300 bg-white px-5 py-3 text-sm font-semibold text-light-1000 transition-all hover:bg-light-100 active:scale-[0.97] dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:hover:bg-dark-200"
    >
      {copied ? (
        <>
          <HiCheck className="h-4 w-4 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <HiClipboard className="h-4 w-4" />
          Copy link
        </>
      )}
    </button>
  );
}

export default function SuccessPage() {
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
    fireConfetti();
  }, []);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({
        title: "Devloops — AI-powered product development",
        text: SHARE_TEXT,
        url: SHARE_URL,
      });
    } catch {
      // User cancelled or share failed — ignore
    }
  }, []);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;

  return (
    <>
      <Head>
        <title>You&apos;re in — Devloops</title>
      </Head>

      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-light-100 dark:bg-dark-50">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <svg className="h-full w-full opacity-[0.35] dark:opacity-[0.15]">
            <pattern
              id="success-grid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="1"
                cy="1"
                r="0.5"
                fill="currentColor"
                className="text-light-600 dark:text-dark-600"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#success-grid)" />
          </svg>
        </div>
        <div className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-green-500/10 blur-[140px]" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-80 w-80 rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-[100px]" />

        <main className="relative z-10 mx-auto max-w-lg px-5 text-center">
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-green-500/25"
          >
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <HiCheck className="h-12 w-12 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-4xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-5xl"
          >
            You&apos;re in!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-3 text-lg text-light-800 dark:text-dark-800"
          >
            We&apos;ll email you the moment early access opens.
          </motion.p>

          {/* Spot number badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-4 py-2"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-sm font-medium text-light-900 dark:text-dark-900">
              You&apos;re on the list — we&apos;ll be in touch soon
            </span>
          </motion.div>

          {/* Share section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mt-10 rounded-2xl border border-light-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80"
          >
            <p className="text-base font-semibold text-light-1000 dark:text-dark-1000">
              Know someone who&apos;d love this?
            </p>
            <p className="mt-1 text-sm text-light-700 dark:text-dark-700">
              Share Devloops and help us grow.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {canNativeShare && (
                <ShareButton
                  onClick={handleNativeShare}
                  icon={HiShare}
                  label="Share"
                  className="bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600"
                />
              )}
              <ShareButton
                href={twitterUrl}
                icon={FaXTwitter}
                label="Post on X"
                className="bg-black hover:bg-gray-900"
              />
              <ShareButton
                href={linkedinUrl}
                icon={FaLinkedinIn}
                label="LinkedIn"
                className="bg-[#0A66C2] hover:bg-[#004182]"
              />
              <CopyLinkButton />
            </div>
          </motion.div>

          {/* Discord */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="mt-5 rounded-2xl border border-light-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80"
          >
            <p className="text-base font-semibold text-light-1000 dark:text-dark-1000">
              Join the community while you wait
            </p>
            <p className="mt-1 text-sm text-light-700 dark:text-dark-700">
              Talk to the team, get sneak peeks, shape the product.
            </p>
            <a
              href="https://discord.gg/ZxjnjfqYSZ"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#4752C4] hover:shadow-lg active:scale-[0.97]"
            >
              <FaDiscord className="h-4 w-4" />
              Join Discord
              <HiArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>

          <motion.a
            href="https://devloops.io"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-8 inline-block pb-8 text-sm text-light-700 transition-colors hover:text-light-1000 dark:text-dark-700 dark:hover:text-dark-1000"
          >
            &larr; Back to devloops.io
          </motion.a>
        </main>
      </div>
    </>
  );
}
