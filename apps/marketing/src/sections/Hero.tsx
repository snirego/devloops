import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { HiSparkles } from "react-icons/hi2";

import Button from "~/components/Button";
import Badge from "~/components/Badge";

/* ─── Animated Kanban Board ─── */

interface KanbanCard {
  id: string;
  title: string;
  color: string;
  avatar: string;
}

const columns: { name: string; cards: KanbanCard[] }[] = [
  {
    name: "To Do",
    cards: [
      { id: "c1", title: "Design new landing", color: "#6366f1", avatar: "S" },
      { id: "c2", title: "Fix auth redirect bug", color: "#f43f5e", avatar: "A" },
      { id: "c3", title: "Update API docs", color: "#8b5cf6", avatar: "M" },
    ],
  },
  {
    name: "In Progress",
    cards: [
      { id: "c4", title: "Implement search", color: "#f59e0b", avatar: "J" },
      { id: "c5", title: "Refactor DB layer", color: "#10b981", avatar: "S" },
    ],
  },
  {
    name: "Done",
    cards: [
      { id: "c6", title: "Deploy v2.1", color: "#06b6d4", avatar: "A" },
    ],
  },
];

function MiniCard({ card, index }: { card: KanbanCard; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="group flex items-start gap-2 rounded-lg border border-light-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md dark:border-dark-300 dark:bg-dark-100"
    >
      <div
        className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: card.color }}
      />
      <div className="flex-1">
        <p className="text-[11px] font-medium leading-tight text-light-1000 dark:text-dark-1000">
          {card.title}
        </p>
      </div>
      <div
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
        style={{ backgroundColor: card.color + "cc" }}
      >
        {card.avatar}
      </div>
    </motion.div>
  );
}

function AnimatedBoard() {
  const [activeCol, setActiveCol] = useState(0);

  // Subtle highlight cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCol((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* Glow behind board */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-pink-500/10 blur-2xl dark:from-brand-500/20 dark:via-purple-500/10 dark:to-pink-500/20" />

      <div className="relative rounded-2xl border border-light-200 bg-light-50/90 p-3 shadow-2xl backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/90 sm:p-4">
        {/* Toolbar */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="h-3 w-24 rounded-full bg-light-200 dark:bg-dark-300" />
          <div className="flex items-center gap-1">
            {["S", "A", "M"].map((initial) => (
              <div
                key={initial}
                className="-ml-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-[7px] font-bold text-white first:ml-0 dark:border-dark-100"
              >
                {initial}
              </div>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {columns.map((col, colIdx) => (
            <div
              key={col.name}
              className={`rounded-xl p-2 transition-colors duration-500 ${
                colIdx === activeCol
                  ? "bg-brand-50/60 dark:bg-brand-500/5"
                  : "bg-light-100 dark:bg-dark-200/50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
                  {col.name}
                </span>
                <span className="flex h-4 w-4 items-center justify-center rounded-md bg-light-200 text-[9px] font-bold text-light-800 dark:bg-dark-400 dark:text-dark-800">
                  {col.cards.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <AnimatePresence>
                  {col.cards.map((card, idx) => (
                    <MiniCard key={card.id} card={card} index={idx} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
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
          <pattern
            id="hero-grid"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.5" fill="currentColor" className="text-light-600 dark:text-dark-600" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
        {/* Radial fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-light-100 dark:to-dark-50" />
      </div>

      {/* Gradient orbs */}
      <div className="pointer-events-none absolute left-1/4 top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-[100px] dark:bg-brand-500/20" />
      <div className="pointer-events-none absolute right-1/4 top-40 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px] dark:bg-purple-500/15" />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-6">
              <HiSparkles className="h-3.5 w-3.5 text-brand-500" />
              <span>AI-powered project management</span>
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-3xl text-4xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-5xl lg:text-6xl"
          >
            One platform.
            <br />
            <span className="gradient-text">Zero chaos.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-xl text-base text-light-900 dark:text-dark-900 sm:text-lg"
          >
            Stop juggling Trello, Slack, Linear, and Notion.
            Devloops brings boards, AI chat, and real-time collaboration into one place
            so your team ships faster.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button href="https://app.devloops.io/signup" size="lg">
              Start Building
            </Button>
            <Button href="#features" variant="secondary" size="lg">
              See it in action
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-4 text-xs text-light-800 dark:text-dark-800"
          >
            No credit card required. Set up in 2 minutes.
          </motion.p>

          {/* Animated Board */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-12 w-full pb-20 sm:mt-16"
          >
            <AnimatedBoard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
