import { motion } from "framer-motion";
import {
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineBanknotes,
} from "react-icons/hi2";

import SectionWrapper from "~/components/SectionWrapper";
import Badge from "~/components/Badge";

const painPoints = [
  {
    icon: HiOutlineClock,
    before: "Hours analyzing customer feedback manually",
    after: "AI auto-analyzes and categorizes in seconds",
    color: "#f43f5e",
  },
  {
    icon: HiOutlineExclamationTriangle,
    before: "Critical bugs buried in Slack threads",
    after: "Feedback becomes tickets automatically",
    color: "#f59e0b",
  },
  {
    icon: HiOutlineArrowPath,
    before: "Endless PM → Dev → PM ping pong",
    after: "AI generates ready-to-run agent prompts",
    color: "#8b5cf6",
  },
  {
    icon: HiOutlineBanknotes,
    before: "Paying for a PM to do what AI can",
    after: "Agents work 24/7, you just approve",
    color: "#10b981",
  },
];

export default function ProblemStrip() {
  return (
    <SectionWrapper className="relative py-20 sm:py-28" id="problem">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500/5 to-[#00DFFF]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Badge className="mb-5">The problem</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-4xl lg:text-5xl">
            Your team is fast.
            <br />
            <span className="gradient-text">Your process is the bottleneck.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-light-700 dark:text-dark-700 sm:text-lg">
            Every hour spent analyzing feedback, writing specs, and context-switching is an hour
            you&apos;re not shipping.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
          {painPoints.map((point, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative overflow-hidden rounded-2xl border border-light-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80"
            >
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                style={{ backgroundColor: point.color }}
              />
              <div className="pl-4">
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: point.color + "18" }}
                >
                  <point.icon className="h-5 w-5" style={{ color: point.color }} />
                </div>
                <p className="text-base font-medium text-light-800 line-through decoration-1 decoration-light-400/50 dark:text-dark-300 dark:decoration-dark-500/40">
                  {point.before}
                </p>
                <p className="mt-3 text-sm font-semibold text-light-1000 dark:text-dark-1000 sm:text-base">
                  {point.after}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
