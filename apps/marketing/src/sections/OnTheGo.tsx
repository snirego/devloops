import { motion } from "framer-motion";
import {
  HiDevicePhoneMobile,
  HiDeviceTablet,
  HiBellAlert,
} from "react-icons/hi2";

import SectionWrapper from "~/components/SectionWrapper";
import Badge from "~/components/Badge";

const benefits = [
  {
    icon: HiDevicePhoneMobile,
    title: "Approve from your phone",
    description: "Review tickets and approve agent runs with one tap. No laptop needed.",
  },
  {
    icon: HiDeviceTablet,
    title: "Full experience on tablet",
    description: "Reviewing feedback, prompts, and pipeline view work great on any screen size.",
  },
  {
    icon: HiBellAlert,
    title: "Notify, then act",
    description: "Get alerted when feedback needs a decision. Respond in seconds from anywhere.",
  },
];

export default function OnTheGo() {
  return (
    <SectionWrapper className="relative py-20 sm:py-28" id="on-the-go">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500/5 to-[#00DFFF]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Badge className="mb-5">On the go</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-4xl lg:text-5xl">
            No laptop? No problem.
            <br />
            <span className="gradient-text">Run Devloops from anywhere.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-light-700 dark:text-dark-700 sm:text-lg">
            Review tickets, approve AI agent runs, and stay in the loop from your phone or tablet.
            Devloops is built to work wherever you are, so you can keep shipping even when you&apos;re
            off the desk.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {benefits.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="rounded-2xl border border-light-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-[#00DFFF]/15">
                <item.icon className="h-6 w-6 text-[#00DFFF]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-light-700 dark:text-dark-700">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
