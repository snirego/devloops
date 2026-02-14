import { useState } from "react";
import { HiOutlineSparkles } from "react-icons/hi2";

import { useAiActivity } from "~/providers/ai-activity";

/**
 * A tiny, persistent indicator that the AI is working in the background.
 * Shows in the sidebar — visible on every page, even when navigating away
 * from the chat. Completely invisible when the AI is idle.
 *
 * Backed by real DB state (aiProcessingSince column), so it survives
 * tab switches, page navigation, and browser refreshes.
 */
export default function AiActivityIndicator({
  isCollapsed,
}: {
  isCollapsed: boolean;
}) {
  const { activeJobs, isActive } = useAiActivity();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isActive) return null;

  return (
    <div className="relative px-2 py-1.5">
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Pulsing dot + sparkle icon */}
        <div className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-indigo-400 opacity-40" />
          <HiOutlineSparkles className="relative h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
        </div>

        {!isCollapsed && (
          <span className="truncate text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
            AI analyzing
            {activeJobs.length > 1 ? ` (${activeJobs.length})` : "..."}
          </span>
        )}

        {/* Tooltip on hover — shows which threads are being analyzed */}
        {showTooltip && (
          <div className="absolute bottom-full left-0 z-50 mb-1 w-56 rounded-lg border border-light-200 bg-white p-2 shadow-lg dark:border-dark-300 dark:bg-dark-100">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
              AI Processing
            </p>
            {activeJobs.map((job) => (
              <div
                key={job.threadId}
                className="flex items-center gap-1.5 py-0.5"
              >
                <div className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-indigo-500" />
                <span className="truncate text-[11px] text-light-700 dark:text-dark-700">
                  {job.threadTitle || `Thread ${job.threadPublicId.slice(0, 8)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
