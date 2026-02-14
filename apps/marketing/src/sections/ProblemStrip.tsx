import { motion } from "framer-motion";
import {
  HiOutlineSquares2X2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineChartBar,
  HiArrowLongRight,
} from "react-icons/hi2";

import SectionWrapper from "~/components/SectionWrapper";
import { useInView } from "~/hooks/useInView";

const scatteredTools = [
  { icon: HiOutlineSquares2X2, label: "Trello", color: "#0079bf" },
  { icon: HiOutlineChatBubbleLeftRight, label: "Slack", color: "#4a154b" },
  { icon: HiOutlineDocumentText, label: "Notion", color: "#000" },
  { icon: HiOutlineChartBar, label: "Linear", color: "#5e6ad2" },
  { icon: HiOutlineEnvelope, label: "Email", color: "#ea4335" },
];

const painPoints = [
  {
    before: "Tasks scattered across 5 tools",
    after: "Everything in one board",
  },
  {
    before: "Context lost in threads",
    after: "AI chat built right in",
  },
  {
    before: "Standups are status theater",
    after: "Real-time visibility for all",
  },
  {
    before: "Another $$/seat/month",
    after: "One tool, one price",
  },
];

function ConvergenceAnimation() {
  const { ref, isInView } = useInView({ threshold: 0.3 });

  return (
    <div ref={ref} className="relative flex items-center justify-center py-8">
      {/* Scattered tool icons */}
      <div className="relative h-48 w-full max-w-md">
        {scatteredTools.map((tool, idx) => {
          const angle = (idx / scatteredTools.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 80;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <motion.div
              key={tool.label}
              className="absolute left-1/2 top-1/2"
              initial={{ x: x, y: y, opacity: 0.3, scale: 1 }}
              animate={
                isInView
                  ? { x: 0, y: 0, opacity: 0, scale: 0.5 }
                  : { x: x, y: y, opacity: 0.3, scale: 1 }
              }
              transition={{
                duration: 1.2,
                delay: idx * 0.1 + 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <div className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-light-200 bg-white shadow-sm dark:border-dark-400 dark:bg-dark-200"
                >
                  <tool.icon className="h-5 w-5" style={{ color: tool.color }} />
                </div>
                <span className="text-[10px] font-medium text-light-800 dark:text-dark-800">
                  {tool.label}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Center: Devloops icon that appears */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0 }}
          animate={
            isInView
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0 }
          }
          transition={{ duration: 0.5, delay: 1.0, ease: "backOut" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-xl shadow-brand-500/25">
            <span className="text-lg font-extrabold text-white">D</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProblemStrip() {
  return (
    <SectionWrapper className="py-20 sm:py-28" id="problem">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-light-1000 dark:text-dark-1000 sm:text-4xl">
            Your tools don&apos;t talk to each other.
            <br />
            <span className="text-light-800 dark:text-dark-800">Your team pays the price.</span>
          </h2>
        </div>

        <ConvergenceAnimation />

        {/* Before / After grid */}
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {painPoints.map((point, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="flex items-center gap-3 rounded-xl border border-light-200 bg-white/60 p-4 backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/60"
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-red-500/80 line-through decoration-red-300">
                  {point.before}
                </p>
                <div className="my-1.5 flex items-center gap-1.5">
                  <HiArrowLongRight className="h-3 w-3 text-brand-500" />
                  <p className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
                    {point.after}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
