import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineViewColumns,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineUserGroup,
  HiOutlineBolt,
} from "react-icons/hi2";

import SectionWrapper from "~/components/SectionWrapper";
import Badge from "~/components/Badge";

/* ─── Tab Definitions ─── */

interface TabDef {
  id: string;
  label: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const tabs: TabDef[] = [
  {
    id: "boards",
    label: "Boards",
    icon: HiOutlineViewColumns,
    title: "Drag. Drop. Done.",
    description: "Intuitive kanban boards that feel as fast as your thoughts. Unlimited boards, lists, and cards with zero friction.",
  },
  {
    id: "ai-chat",
    label: "AI Chat",
    icon: HiOutlineChatBubbleLeftEllipsis,
    title: "Your AI project partner.",
    description: "Ask questions, create tasks, triage work items -- all through natural conversation. Context-aware, always ready.",
  },
  {
    id: "collaboration",
    label: "Real-time",
    icon: HiOutlineUserGroup,
    title: "See your team move.",
    description: "Real-time updates, comments, mentions, and activity feeds. Everyone stays in sync without a single ping.",
  },
  {
    id: "work-items",
    label: "Work Items",
    icon: HiOutlineBolt,
    title: "From chaos to clarity.",
    description: "Ingest work from anywhere -- emails, chats, bugs. AI auto-triages and routes items to the right board.",
  },
];

/* ─── Preview Mockups ─── */

function BoardPreview() {
  const cols = [
    {
      name: "Backlog",
      cards: [
        { title: "User onboarding flow", tag: "Feature", tagColor: "#6366f1" },
        { title: "Mobile responsive fixes", tag: "Bug", tagColor: "#f43f5e" },
      ],
    },
    {
      name: "In Progress",
      cards: [
        { title: "Payment integration", tag: "Feature", tagColor: "#6366f1" },
      ],
    },
    {
      name: "Review",
      cards: [
        { title: "API rate limiting", tag: "Infra", tagColor: "#f59e0b" },
      ],
    },
    {
      name: "Done",
      cards: [
        { title: "Auth v2 rollout", tag: "Feature", tagColor: "#6366f1" },
        { title: "Dashboard redesign", tag: "Design", tagColor: "#8b5cf6" },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cols.map((col) => (
        <div key={col.name} className="rounded-lg bg-light-100 p-2 dark:bg-dark-200/50">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-light-700 dark:text-dark-700">
            {col.name}
          </p>
          <div className="flex flex-col gap-1.5">
            {col.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-md border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100"
              >
                <p className="text-[10px] font-medium text-light-1000 dark:text-dark-1000">
                  {card.title}
                </p>
                <span
                  className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white"
                  style={{ backgroundColor: card.tagColor }}
                >
                  {card.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIChatPreview() {
  const messages = [
    { role: "user" as const, text: "Create a task for the checkout bug reported by Sarah" },
    {
      role: "ai" as const,
      text: 'Done! Created "Fix checkout validation error" on the Bugs board, assigned to Sarah with high priority.',
    },
    { role: "user" as const, text: "What's blocking the v2.1 release?" },
    {
      role: "ai" as const,
      text: "2 items remain: API rate limiting (in review) and mobile responsive fixes (in progress). ETA looks like Thursday.",
    },
  ];

  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < messages.length) {
      const timeout = setTimeout(() => setVisibleCount((c) => c + 1), 800);
      return () => clearTimeout(timeout);
    }
    // Reset after showing all
    const resetTimeout = setTimeout(() => setVisibleCount(0), 3000);
    return () => clearTimeout(resetTimeout);
  }, [visibleCount, messages.length]);

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence>
        {messages.slice(0, visibleCount).map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-[10px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-500 text-white"
                  : "border border-light-200 bg-white text-light-1000 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-1000"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {visibleCount < messages.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-1 px-2"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-light-600 dark:bg-dark-600" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-light-600 delay-75 dark:bg-dark-600" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-light-600 delay-150 dark:bg-dark-600" />
        </motion.div>
      )}
    </div>
  );
}

function CollaborationPreview() {
  const activities = [
    { user: "Sarah", action: 'moved "Fix auth" to Done', time: "2m ago", avatar: "S", color: "#6366f1" },
    { user: "Alex", action: 'commented on "API docs"', time: "5m ago", avatar: "A", color: "#f59e0b" },
    { user: "Mike", action: 'created "Deploy pipeline"', time: "8m ago", avatar: "M", color: "#10b981" },
    { user: "Jordan", action: "joined the workspace", time: "12m ago", avatar: "J", color: "#f43f5e" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {activities.map((act, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.15, duration: 0.3 }}
          className="flex items-center gap-2 rounded-lg border border-light-200 bg-white p-2 dark:border-dark-300 dark:bg-dark-100"
        >
          <div
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: act.color }}
          >
            {act.avatar}
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-light-1000 dark:text-dark-1000">
              <span className="font-semibold">{act.user}</span> {act.action}
            </p>
          </div>
          <span className="flex-shrink-0 text-[9px] text-light-700 dark:text-dark-700">
            {act.time}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function WorkItemsPreview() {
  const items = [
    { source: "Email", title: "Server 500 errors on checkout", priority: "High", color: "#f43f5e" },
    { source: "Slack", title: "Customer requesting bulk export", priority: "Medium", color: "#f59e0b" },
    { source: "GitHub", title: "PR #142 needs review", priority: "Low", color: "#10b981" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.2, duration: 0.3 }}
          className="flex items-center gap-3 rounded-lg border border-light-200 bg-white p-2.5 dark:border-dark-300 dark:bg-dark-100"
        >
          <div className="flex h-6 min-w-[3.5rem] items-center justify-center rounded-md bg-light-100 text-[8px] font-bold text-light-800 dark:bg-dark-300 dark:text-dark-800">
            {item.source}
          </div>
          <p className="flex-1 text-[10px] font-medium text-light-1000 dark:text-dark-1000">
            {item.title}
          </p>
          <span
            className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
            style={{ backgroundColor: item.color }}
          >
            {item.priority}
          </span>
        </motion.div>
      ))}
      <div className="mt-1 flex items-center gap-1.5 rounded-md bg-brand-50/50 px-2 py-1.5 dark:bg-brand-500/5">
        <HiOutlineBolt className="h-3 w-3 text-brand-500" />
        <p className="text-[9px] font-medium text-brand-600 dark:text-brand-400">
          AI auto-triaged 3 items and routed to boards
        </p>
      </div>
    </div>
  );
}

const previews: Record<string, React.FC> = {
  boards: BoardPreview,
  "ai-chat": AIChatPreview,
  collaboration: CollaborationPreview,
  "work-items": WorkItemsPreview,
};

/* ─── Main Component ─── */

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("boards");

  // Auto-cycle tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const idx = tabs.findIndex((t) => t.id === prev);
        return tabs[(idx + 1) % tabs.length]!.id;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentTab = tabs.find((t) => t.id === activeTab)!;
  const PreviewComponent = previews[activeTab]!;

  return (
    <SectionWrapper className="py-20 sm:py-28" id="features">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Badge>Features</Badge>
          <h2 className="mt-4 text-3xl font-bold text-light-1000 dark:text-dark-1000 sm:text-4xl">
            Everything your team needs.
            <br />
            Nothing it doesn&apos;t.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-light-900 dark:text-dark-900">
            Built for teams that move fast. Every feature designed to eliminate context-switching
            and keep everyone in flow.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-light-1000 text-light-50 shadow-lg dark:bg-dark-1000 dark:text-dark-50"
                  : "text-light-800 hover:bg-light-200 dark:text-dark-800 dark:hover:bg-dark-200"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="mx-auto mt-10 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-light-200 bg-white/80 shadow-xl backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: Description */}
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTab.id + "-text"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-bold text-light-1000 dark:text-dark-1000">
                      {currentTab.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-light-900 dark:text-dark-900">
                      {currentTab.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right: Animated preview */}
              <div className="border-t border-light-200 bg-light-50 p-4 dark:border-dark-300 dark:bg-dark-50 sm:p-6 md:border-l md:border-t-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTab.id + "-preview"}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PreviewComponent />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full bg-light-200 dark:bg-dark-300">
              <motion.div
                key={activeTab}
                className="h-full bg-gradient-to-r from-brand-500 to-purple-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
