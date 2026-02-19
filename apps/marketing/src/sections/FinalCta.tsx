import { motion } from "framer-motion";

import Button from "~/components/Button";
import { useInView } from "~/hooks/useInView";

export default function FinalCta() {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section ref={ref} className="relative overflow-hidden py-24 sm:py-32">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-light-100 via-light-50 to-light-100 dark:from-dark-50 dark:via-dark-100 dark:to-dark-50" />

      {/* Animated orbs */}
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/5 blur-[100px] dark:bg-brand-500/10" />
      <div className="pointer-events-none absolute right-1/3 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-[100px] dark:bg-purple-500/10" />

      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-extrabold text-light-1000 dark:text-dark-1000 sm:text-4xl lg:text-5xl">
            Stop analyzing.
            <br />
            <span className="gradient-text">Start shipping.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-lg text-base text-light-900 dark:text-dark-900 sm:text-lg">
            Let AI handle the busywork. Your team focuses on what matters.
            building the product your customers are asking for.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="http://localhost:3003" size="lg">
              Join the Waitlist
            </Button>
          </div>

          <p className="mt-4 text-xs text-light-700 dark:text-dark-700">
            Set up in 2 minutes.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
