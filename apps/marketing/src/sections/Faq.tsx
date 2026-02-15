import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiMiniPlusSmall, HiMiniMinusSmall } from "react-icons/hi2";

import SectionWrapper from "~/components/SectionWrapper";
import Badge from "~/components/Badge";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What exactly does Devloops do?",
    answer:
      "Devloops takes customer feedback from any source (Intercom, Slack, email, support tickets), uses AI to automatically triage and categorize it, generates detailed agent-ready prompts, and lets you send those prompts to AI coding agents. It replaces the manual grind of triaging, writing specs, and creating tasks -- so your team ships faster.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "We don't do free trials. Our plans start at $8/mo per member (billed yearly) and include everything from day one. No feature gates, no surprises. You get the full power of the platform immediately -- because we want you shipping fast from minute one.",
  },
  {
    question: "Can I switch plans or cancel anytime?",
    answer:
      "Absolutely. You can upgrade, downgrade, or cancel at any time. If you cancel, you'll keep access until the end of your billing period. No lock-in, no cancellation fees.",
  },
  {
    question: "How does the AI triage work?",
    answer:
      "When feedback comes in, our AI reads the content, determines whether it's a bug, feature request, or improvement, assigns a priority level, detects duplicates, and groups related items. It then generates a structured ticket with a detailed prompt that's ready for an AI agent to execute on.",
  },
  {
    question: "Which AI agents does Devloops work with?",
    answer:
      "Devloops generates agent-ready prompts that work with any AI coding agent -- Cursor, Devin, Claude, GPT-based agents, and more. The prompts include full context, acceptance criteria, and technical details so agents can start working immediately.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Your data is encrypted at rest and in transit. We're GDPR compliant with a 99.9% uptime SLA. All AI processing is done securely and your proprietary code never leaves your controlled environment.",
  },
];

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-light-200 last:border-0 dark:border-dark-300">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 text-sm font-semibold text-light-1000 dark:text-dark-1000">
          {item.question}
        </span>
        <span className="flex-shrink-0 text-light-700 dark:text-dark-700">
          {isOpen ? <HiMiniMinusSmall size={20} /> : <HiMiniPlusSmall size={20} />}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-light-800 dark:text-dark-800">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SectionWrapper className="py-20 sm:py-28" id="faq">
      <div className="mx-auto max-w-2xl px-5">
        <div className="text-center">
          <Badge>FAQ</Badge>
          <h2 className="mt-4 text-3xl font-bold text-light-1000 dark:text-dark-1000 sm:text-4xl">
            Questions? Answers.
          </h2>
        </div>

        <div className="mt-12 rounded-2xl border border-light-200 bg-white/80 px-6 backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/80 sm:px-8">
          {faqs.map((faq, idx) => (
            <FaqAccordion
              key={idx}
              item={faq}
              isOpen={openIndex === idx}
              onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
            />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
