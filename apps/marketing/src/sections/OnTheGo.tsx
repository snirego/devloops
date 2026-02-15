import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  HiDevicePhoneMobile,
  HiDeviceTablet,
  HiBellAlert,
  HiCheck,
  HiEnvelope,
  HiOutlineBellAlert,
  HiCpuChip,
  HiArrowRight,
} from "react-icons/hi2";
import { SiSlack, SiIntercom } from "react-icons/si";

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

const sourceIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Slack: SiSlack,
  Intercom: SiIntercom,
  Email: HiEnvelope,
};

const demoTickets = [
  { id: 1, source: "Slack", sourceColor: "#611f69", title: "Login fails on mobile", type: "Bug", priority: "High" },
  { id: 2, source: "Intercom", sourceColor: "#1f8ded", title: "Export to CSV", type: "Feature", priority: "Medium" },
  { id: 3, source: "Email", sourceColor: "#ea4335", title: "Checkout flow confusing", type: "Improvement", priority: "Low" },
];

const ease = [0.25, 0.46, 0.45, 0.94];

/* Fixed dimensions – thin frame, never change */
const PHONE_WIDTH = 224;
const PHONE_HEIGHT = 456;
const BEZEL = 4;
const SCREEN_WIDTH = PHONE_WIDTH - BEZEL * 2;
const SCREEN_HEIGHT = PHONE_HEIGHT - BEZEL * 2;
const CONTENT_HEIGHT = 312;
const NOTCH_W = 72;
const NOTCH_H = 6;
const NOTCH_R = 4;

/* Connection strip: same width as phone wrapper; paths from phone center to each agent */
const CONNECTION_WIDTH = PHONE_WIDTH + 16;
const CONNECTION_HEIGHT = 56;
const PHONE_CENTER_X = CONNECTION_WIDTH / 2;
const PILL_WIDTH = 64;
const PILL_GAP = 16;
const AGENT_ROW_WIDTH = PILL_WIDTH * 3 + PILL_GAP * 2;
const AGENT_ROW_LEFT = (CONNECTION_WIDTH - AGENT_ROW_WIDTH) / 2;
const AGENT_CENTERS = [
  AGENT_ROW_LEFT + PILL_WIDTH / 2,
  AGENT_ROW_LEFT + PILL_WIDTH / 2 + PILL_WIDTH + PILL_GAP,
  AGENT_ROW_LEFT + PILL_WIDTH / 2 + (PILL_WIDTH + PILL_GAP) * 2,
] as const;

function ElectricConnections({
  visible,
  activeAgentIndex,
}: {
  visible: boolean;
  activeAgentIndex: number;
}) {
  return (
    <div
      className="relative flex justify-center text-light-400 dark:text-dark-500"
      style={{ width: CONNECTION_WIDTH, height: CONNECTION_HEIGHT }}
    >
      <svg
        width={CONNECTION_WIDTH}
        height={CONNECTION_HEIGHT}
        className="absolute inset-0 overflow-visible"
      >
        {AGENT_CENTERS.map((cx, i) => {
          const showPath = visible && i === activeAgentIndex;
          const path = `M ${PHONE_CENTER_X} 0 Q ${(PHONE_CENTER_X + cx) / 2} ${CONNECTION_HEIGHT / 2} ${cx} ${CONNECTION_HEIGHT}`;
          return (
            <g key={i}>
              <motion.path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={showPath ? { opacity: 0.4 } : { opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
              <motion.path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="4 20"
                className="text-[#00DFFF]"
                initial={{ opacity: 0 }}
                animate={
                  showPath ? { opacity: 0.5, strokeDashoffset: [0, -24] } : { opacity: 0 }
                }
                transition={{
                  strokeDashoffset: { repeat: showPath ? Infinity : 0, duration: 1.2, ease: "linear" },
                  opacity: { duration: 0.3 },
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AgentPill({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <motion.div
      animate={{
        scale: 1,
        opacity: active || done ? 1 : 0.75,
        boxShadow:
          active && !done
            ? "0 0 0 2px rgba(0, 223, 255, 0.4), 0 8px 24px -4px rgba(0, 223, 255, 0.25)"
            : done
              ? "0 0 0 2px rgba(34, 197, 94, 0.3), 0 4px 12px -2px rgba(34, 197, 94, 0.2)"
              : "0 4px 12px -2px rgba(0,0,0,0.08)",
      }}
      transition={{ duration: 0.3 }}
      className="flex h-[72px] w-16 flex-col items-center justify-center gap-1 rounded-2xl border border-light-200 bg-white py-2 shadow-md dark:border-dark-400 dark:bg-dark-200"
    >
      {/* Fixed-height icon slot so pill never resizes */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center">
        {done ? (
          <HiCheck className="h-6 w-6 text-green-500" />
        ) : active ? (
          <div className="flex items-end gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ height: ["6px", "12px", "6px"] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.6,
                  delay: i * 0.12,
                }}
                className="w-1 rounded-full bg-[#00DFFF]"
                style={{ minHeight: 6 }}
              />
            ))}
          </div>
        ) : (
          <HiCpuChip className="h-5 w-5 text-light-900 dark:text-white" />
        )}
      </div>
      <span
        className={`text-[11px] font-semibold tabular-nums ${
          done
            ? "text-green-600 dark:text-green-400"
            : active
              ? "text-[#00DFFF]"
              : "text-light-1000 dark:text-white"
        }`}
      >
        {done ? "Done" : active ? "Running" : label}
      </span>
    </motion.div>
  );
}

function PhoneMockup({
  step,
  ticket,
}: {
  step: number;
  ticket: (typeof demoTickets)[number];
}) {
  return (
    <div className="relative" style={{ width: PHONE_WIDTH + 16 }}>
      <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-purple-500/10 to-[#00DFFF]/10 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
        className="relative"
        style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
      >
        <div
          className="absolute inset-0 overflow-visible rounded-[2rem] bg-black"
          style={{
            width: PHONE_WIDTH,
            height: PHONE_HEIGHT,
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.4)",
          }}
        >
          {/* Screen – no side buttons */}
          <div
            className="absolute overflow-hidden bg-white dark:bg-[#0c0c0c]"
            style={{
              left: BEZEL,
              top: BEZEL,
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              borderRadius: 22,
            }}
          >
            <div
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b-sm bg-black"
              style={{
                width: NOTCH_W,
                height: NOTCH_H + 1,
                borderBottomLeftRadius: NOTCH_R,
                borderBottomRightRadius: NOTCH_R,
              }}
            />

            <div
              className="relative z-0 flex justify-between px-4 text-[9px] font-medium text-light-500 dark:text-dark-600"
              style={{ paddingTop: 14, paddingBottom: 6 }}
            >
              <span>9:41</span>
              <span className="flex items-center gap-0.5 opacity-70">
                <HiOutlineBellAlert className="h-2.5 w-2.5" />
                Devloops
              </span>
            </div>

            <div className="relative overflow-hidden px-3 pt-1" style={{ height: CONTENT_HEIGHT }}>
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="in"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.26, ease }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ delay: 0.12, duration: 0.4 }}
                      className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#00DFFF]/20"
                    >
                      <HiOutlineBellAlert className="h-5 w-5 text-[#00DFFF]" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white/95 px-3 py-2 shadow-md dark:bg-dark-200/95"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: ticket.sourceColor + "28" }}
                      >
                        {(() => {
                          const Icon = sourceIcons[ticket.source] ?? HiOutlineBellAlert;
                          return <Icon className="h-4 w-4" style={{ color: ticket.sourceColor }} />;
                        })()}
                      </div>
                      <p className="text-[11px] font-semibold text-light-1000 dark:text-dark-1000">{ticket.source}</p>
                    </motion.div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="send"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 rounded-full px-2.5 py-1"
                      style={{ backgroundColor: ticket.sourceColor + "18" }}
                    >
                      {(() => {
                        const Icon = sourceIcons[ticket.source] ?? HiOutlineBellAlert;
                        return <Icon className="h-3 w-3" style={{ color: ticket.sourceColor }} />;
                      })()}
                      <span className="text-[10px] font-semibold text-light-1000 dark:text-dark-1000">{ticket.source}</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 360, damping: 22 }}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00DFFF] shadow-lg shadow-[#00DFFF]/35"
                    >
                      <HiArrowRight className="h-5 w-5 text-white" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-light-100 dark:bg-dark-300"
                    >
                      <HiCpuChip className="h-4 w-4 text-[#00DFFF]" />
                    </motion.div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  >
                    <motion.div
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00DFFF]/15"
                    >
                      <HiCpuChip className="h-7 w-7 text-[#00DFFF]" />
                    </motion.div>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-1.5 w-8 rounded-full bg-[#00DFFF]/40"
                    />
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/25"
                    >
                      <HiCheck className="h-7 w-7 text-white" />
                    </motion.div>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-2 text-[10px] font-semibold text-green-600 dark:text-green-400"
                    >
                      Done
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const PHASES_PER_FEEDBACK = 4;
const FEEDBACK_COUNT = 3;
const PHASES_PER_CYCLE = PHASES_PER_FEEDBACK * FEEDBACK_COUNT;

export default function OnTheGo() {
  const [phase, setPhase] = useState(0);

  const feedbackIndex = Math.floor(phase / PHASES_PER_FEEDBACK) % FEEDBACK_COUNT;
  const stepInFeedback = phase % PHASES_PER_FEEDBACK;
  const ticket = demoTickets[feedbackIndex]!;

  useEffect(() => {
    const stepInFeedback = phase % PHASES_PER_FEEDBACK;
    const delayMs =
      stepInFeedback === 0 ? 2000 : stepInFeedback === 1 ? 500 : stepInFeedback === 2 ? 2000 : 1800;
    const t = setTimeout(() => {
      setPhase((prev) => (prev + 1) % PHASES_PER_CYCLE);
    }, delayMs);
    return () => clearTimeout(t);
  }, [phase]);

  const phoneStep = stepInFeedback;
  const connectionsVisible = stepInFeedback >= 1;
  const activeAgentIndex = feedbackIndex;
  const isAgentRunning = (i: number) => i === feedbackIndex && stepInFeedback === 2;
  const isAgentDone = (i: number) => i < feedbackIndex || (i === feedbackIndex && stepInFeedback === 3);

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
            Approve from your phone. Agents run in the background.
          </p>
        </div>

        {/* Phone + electric connections + agents */}
        <div className="mt-14 flex flex-col items-center gap-0">
          <PhoneMockup step={phoneStep} ticket={ticket} />
          <ElectricConnections visible={connectionsVisible} activeAgentIndex={activeAgentIndex} />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center"
            style={{ width: CONNECTION_WIDTH, gap: PILL_GAP }}
          >
            {demoTickets.map((t, i) => (
              <AgentPill
                key={t.source}
                label="Agent"
                active={isAgentRunning(i)}
                done={isAgentDone(i)}
              />
            ))}
          </motion.div>
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
