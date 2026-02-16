import { motion } from "framer-motion";
import {
  HiOutlineLink,
  HiOutlineInboxArrowDown,
  HiOutlineCpuChip,
  HiOutlineDocumentText,
  HiOutlineRocketLaunch,
} from "react-icons/hi2";

import SectionWrapper from "~/components/SectionWrapper";
import Badge from "~/components/Badge";

const steps = [
  {
    num: "01",
    icon: HiOutlineLink,
    title: "Connect your sources",
    desc: "Link your GitHub repos and connect your feedback channels — Slack, Intercom, email, Zendesk, or any platform your customers reach you on.",
  },
  {
    num: "02",
    icon: HiOutlineInboxArrowDown,
    title: "Feedback flows in",
    desc: "Every bug report, feature request, and complaint from every connected source lands in one place. Automatically. Nothing gets lost.",
  },
  {
    num: "03",
    icon: HiOutlineCpuChip,
    title: "AI analyzes instantly",
    desc: "Each item is categorized as a bug, feature, or improvement. Priority is assigned, duplicates are merged. No PM work needed.",
  },
  {
    num: "04",
    icon: HiOutlineDocumentText,
    title: "Prompts are generated",
    desc: "Detailed, context-rich prompts with acceptance criteria and technical details — ready for any AI coding agent to pick up.",
  },
  {
    num: "05",
    icon: HiOutlineRocketLaunch,
    title: "Approve and ship",
    desc: "One click sends it to an agent. Review the PR, approve, deploy. Feedback to shipped code in hours, not weeks.",
  },
];

export default function HowItWorks() {
  return (
    <SectionWrapper className="py-20 sm:py-28" id="how-it-works">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Badge>No BS</Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-4xl lg:text-5xl">
            Here&apos;s what it <span className="gradient-text">actually does.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-light-800 dark:text-dark-800">
            Five steps. Fully automated. You stay in control.
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-2xl">
          {/* Animated vertical line */}
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute left-6 top-0 h-full w-px origin-top"
          >
            <div className="h-full w-full bg-gradient-to-b from-transparent via-[#00DFFF]/25 to-transparent" />
          </motion.div>

          <div className="flex flex-col gap-10 sm:gap-0">
            {steps.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="group relative flex items-start gap-5 sm:gap-8 sm:py-8"
              >
                {/* Icon circle */}
                <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-light-200 bg-white shadow-sm transition-shadow group-hover:shadow-md dark:border-dark-400 dark:bg-dark-200">
                  <step.icon className="h-5 w-5 text-[#00DFFF]" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tracking-widest text-[#00DFFF]">{step.num}</span>
                    <h3 className="text-lg font-bold text-light-1000 dark:text-dark-1000 sm:text-xl">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-light-800 dark:text-dark-700">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
