import { motion } from "framer-motion";

import { useInView } from "~/hooks/useInView";
import { useAnimatedCounter } from "~/hooks/useAnimatedCounter";

interface MetricCardProps {
  value: number;
  suffix: string;
  label: string;
  delay: number;
  isActive: boolean;
}

function MetricCard({ value, suffix, label, delay, isActive }: MetricCardProps) {
  const count = useAnimatedCounter(value, isActive, 2000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center"
    >
      <div className="flex items-baseline gap-0.5">
        <span className="text-4xl font-extrabold tabular-nums text-light-1000 dark:text-dark-1000 sm:text-5xl">
          {count}
        </span>
        <span className="text-xl font-bold text-brand-500 sm:text-2xl">
          {suffix}
        </span>
      </div>
      <p className="mt-1 text-center text-sm text-light-800 dark:text-dark-800">
        {label}
      </p>
    </motion.div>
  );
}

const metrics = [
  { value: 80, suffix: "%", label: "less time analyzing" },
  { value: 10, suffix: "x", label: "faster feedback loops" },
  { value: 24, suffix: "/7", label: "agents never sleep" },
  { value: 2, suffix: "min", label: "setup time" },
];

export default function Metrics() {
  const { ref, isInView } = useInView({ threshold: 0.3 });

  return (
    <section ref={ref} className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-5">
        <div className="rounded-2xl border border-light-200 bg-white/60 p-8 backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/60 sm:p-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {metrics.map((metric, idx) => (
              <MetricCard
                key={metric.label}
                value={metric.value}
                suffix={metric.suffix}
                label={metric.label}
                delay={idx * 0.1}
                isActive={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
