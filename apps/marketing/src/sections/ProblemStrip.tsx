import { motion } from "framer-motion";
import {
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiArrowLongRight,
} from "react-icons/hi2";

import SectionWrapper from "~/components/SectionWrapper";

const painPoints = [
  {
    icon: HiOutlineClock,
    before: "Hours triaging customer feedback manually",
    after: "AI auto-triages and categorizes in seconds",
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
    <SectionWrapper className="py-20 sm:py-28" id="problem">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-light-1000 dark:text-dark-1000 sm:text-4xl">
            Your team is fast.
            <br />
            <span className="text-light-800 dark:text-dark-800">Your process is the bottleneck.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-light-900 dark:text-dark-900">
            Every hour spent triaging, writing specs, and context-switching is an hour
            you&apos;re not shipping. Devloops eliminates the busywork.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {painPoints.map((point, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="group rounded-xl border border-light-200 bg-white/60 p-5 backdrop-blur-sm transition-all duration-200 hover:shadow-md dark:border-dark-300 dark:bg-dark-100/60"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: point.color + "15" }}
                >
                  <point.icon className="h-4 w-4" style={{ color: point.color }} />
                </div>
              </div>
              <p className="text-xs font-medium text-red-500/80 line-through decoration-red-300/50">
                {point.before}
              </p>
              <div className="my-2 flex items-center gap-1.5">
                <HiArrowLongRight className="h-3 w-3 text-brand-500" />
                <p className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
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
