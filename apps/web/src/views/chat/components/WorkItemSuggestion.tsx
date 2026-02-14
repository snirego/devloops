import { useRouter } from "next/router";
import { HiOutlineCpuChip, HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";

interface WorkItemSuggestionProps {
  workItemPublicId: string;
  reason: string;
}

export default function WorkItemSuggestion({
  workItemPublicId,
  reason,
}: WorkItemSuggestionProps) {
  const router = useRouter();

  return (
    <div className="mx-4 my-2 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-950/30">
      <HiOutlineCpuChip className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">
          AI Suggested a Work Item
        </p>
        <p className="mt-0.5 text-xs text-brand-500 dark:text-brand-400">
          {reason}
        </p>
        <button
          onClick={() => router.push("/work-items")}
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1 text-xs font-medium text-white transition-colors duration-0 hover:bg-brand-600"
        >
          <HiOutlineArrowTopRightOnSquare className="h-3 w-3" />
          View Work Item
        </button>
      </div>
    </div>
  );
}
