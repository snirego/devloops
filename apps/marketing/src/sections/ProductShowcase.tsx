import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineBolt,
  HiOutlineSparkles,
  HiOutlineRocketLaunch,
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
    id: "feedback-intake",
    label: "Feedback Intake",
    icon: HiOutlineChatBubbleLeftEllipsis,
    title: "Every signal captured. None lost.",
    description: "Customer feedback from Intercom, Slack, email, and support tickets flows into one stream. No more digging through channels to find what users are saying.",
  },
  {
    id: "ai-analysis",
    label: "AI Analysis",
    icon: HiOutlineSparkles,
    title: "Your AI product manager.",
    description: "AI reads every piece of feedback, categorizes it (bug, feature, improvement), assigns priority, and groups duplicates. What took your PM hours now takes seconds.",
  },
  {
    id: "prompt-gen",
    label: "Prompt Generation",
    icon: HiOutlineBolt,
    title: "From ticket to agent-ready prompt.",
    description: "Each analyzed item automatically generates a detailed, context-rich prompt ready for an AI coding agent. Complete with acceptance criteria and technical context.",
  },
  {
    id: "agent-exec",
    label: "Agent Execution",
    icon: HiOutlineRocketLaunch,
    title: "Approve. Ship. Repeat.",
    description: "One click to send the prompt to an AI agent. Review the output, approve, and ship. Your feedback loop just went from weeks to hours.",
  },
];

/* ─── Preview Mockups ─── */

function FeedbackIntakePreview() {
  const feedbacks = [
    { source: "Intercom", text: "Can't upload files larger than 5MB", time: "2m ago", color: "#1f8ded" },
    { source: "Slack", text: "Users want dark mode in dashboard", time: "5m ago", color: "#4a154b" },
    { source: "Email", text: "Payment fails with EU cards", time: "8m ago", color: "#ea4335" },
    { source: "Zendesk", text: "Search results not returning latest items", time: "12m ago", color: "#03363d" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {feedbacks.map((fb, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.12, duration: 0.3 }}
          className="flex items-start gap-2.5 rounded-lg border border-light-200 bg-white p-2.5 dark:border-dark-300 dark:bg-dark-100"
        >
          <span
            className="mt-0.5 flex-shrink-0 rounded-md px-1.5 py-0.5 text-[7px] font-bold text-white"
            style={{ backgroundColor: fb.color }}
          >
            {fb.source}
          </span>
          <p className="flex-1 text-[10px] leading-relaxed text-light-1000 dark:text-dark-1000">{fb.text}</p>
          <span className="flex-shrink-0 text-[8px] text-light-600 dark:text-dark-600">{fb.time}</span>
        </motion.div>
      ))}
    </div>
  );
}

function AIAnalysisPreview() {
  const items = [
    { title: "File upload size limit", type: "Bug", priority: "High", typeColor: "#f43f5e", prioColor: "#f43f5e" },
    { title: "Dark mode request", type: "Feature", priority: "Medium", typeColor: "#6366f1", prioColor: "#f59e0b" },
    { title: "EU card payment failure", type: "Bug", priority: "Critical", typeColor: "#f43f5e", prioColor: "#dc2626" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-md bg-purple-50/50 px-2 py-1.5 dark:bg-purple-500/5">
        <HiOutlineSparkles className="h-3 w-3 text-purple-500" />
        <p className="text-[9px] font-medium text-purple-600 dark:text-purple-400">
          AI analyzed 4 items &middot; 2 bugs, 1 feature, 1 duplicate removed
        </p>
      </div>
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.15 + 0.3, duration: 0.3 }}
          className="flex items-center gap-2 rounded-lg border border-light-200 bg-white p-2.5 dark:border-dark-300 dark:bg-dark-100"
        >
          <div className="flex-1">
            <p className="text-[10px] font-medium text-light-1000 dark:text-dark-1000">{item.title}</p>
          </div>
          <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white" style={{ backgroundColor: item.typeColor }}>{item.type}</span>
          <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white" style={{ backgroundColor: item.prioColor }}>{item.priority}</span>
        </motion.div>
      ))}
    </div>
  );
}

function PromptGenPreview() {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTyping(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-light-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-100">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold text-light-1000 dark:text-dark-1000">BUG-892: File upload size limit</span>
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[7px] font-bold text-green-600 dark:bg-green-500/10 dark:text-green-400">Ready</span>
        </div>
        <div className="rounded-md bg-light-100 p-2 dark:bg-dark-200">
          {typing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <p className="text-[8px] font-mono leading-relaxed text-light-900 dark:text-dark-900">
                <span className="text-brand-500">## Task</span><br />
                Increase file upload limit from 5MB to 50MB<br /><br />
                <span className="text-brand-500">## Context</span><br />
                Multiple users report upload failures. Current limit set in /api/upload middleware.<br /><br />
                <span className="text-brand-500">## Acceptance Criteria</span><br />
                - Update max file size to 50MB<br />
                - Add client-side validation with clear error<br />
                - Update S3 presigned URL config
              </p>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="h-1 w-1 animate-pulse rounded-full bg-brand-500" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-brand-500 delay-75" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-brand-500 delay-150" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentExecPreview() {
  return (
    <div className="flex flex-col gap-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border border-light-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-100"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <span className="text-[9px] font-semibold text-green-600 dark:text-green-400">Agent running</span>
          </div>
          <span className="text-[8px] text-light-600 dark:text-dark-600">BUG-892</span>
        </div>
        <div className="space-y-1.5 text-[8px] text-light-700 dark:text-dark-700">
          <div className="flex items-center gap-1.5">
            <span className="text-green-500">&#10003;</span>
            <span>Analyzed codebase and found upload middleware</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-green-500">&#10003;</span>
            <span>Updated file size limit to 50MB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-green-500">&#10003;</span>
            <span>Added client-side validation component</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="animate-pulse text-brand-500">&#9679;</span>
            <span>Running tests...</span>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 p-2 dark:border-green-500/20 dark:bg-green-500/5"
      >
        <span className="text-[9px] font-medium text-green-700 dark:text-green-400">Ready for your review</span>
        <span className="rounded-md bg-green-600 px-2 py-0.5 text-[8px] font-bold text-white">Approve & Ship</span>
      </motion.div>
    </div>
  );
}

const previews: Record<string, React.FC> = {
  "feedback-intake": FeedbackIntakePreview,
  "ai-analysis": AIAnalysisPreview,
  "prompt-gen": PromptGenPreview,
  "agent-exec": AgentExecPreview,
};

/* ─── Main Component ─── */

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("feedback-intake");

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
          <Badge>How it works</Badge>
          <h2 className="mt-4 text-3xl font-bold text-light-1000 dark:text-dark-1000 sm:text-4xl">
            From customer feedback
            <br />
            to shipped code. Automatically.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-light-900 dark:text-dark-900">
            Devloops replaces the manual grind of analyzing feedback, spec-writing, and task creation
            with an AI-powered pipeline that never sleeps.
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
