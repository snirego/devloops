import { useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";

import { api } from "~/utils/api";

interface IngestPanelProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function IngestPanel({ onClose, onSuccess }: IngestPanelProps) {
  const [customerId, setCustomerId] = useState("test-user-1");
  const [rawText, setRawText] = useState("");
  const [source, setSource] = useState<
    "widget" | "email" | "whatsapp" | "slack" | "api"
  >("api");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ingest = api.feedbackThread.ingest.useMutation({
    onSuccess: (data) => {
      setResult(data as unknown as Record<string, unknown>);
      setLoading(false);
      setRawText("");
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const handleSubmit = () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    ingest.mutate({
      source,
      customerId: customerId || undefined,
      rawText: rawText.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-dark-50">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-light-900 dark:text-dark-900">
            Ingest Message
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-light-200 dark:hover:bg-dark-200"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-light-900 dark:text-dark-900">
                Customer ID
              </label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-md border border-light-300 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-100"
                placeholder="customer-123"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-xs font-medium text-light-900 dark:text-dark-900">
                Source
              </label>
              <select
                value={source}
                onChange={(e) =>
                  setSource(
                    e.target.value as
                      | "widget"
                      | "email"
                      | "whatsapp"
                      | "slack"
                      | "api",
                  )
                }
                className="w-full rounded-md border border-light-300 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-100"
              >
                <option value="api">API</option>
                <option value="widget">Widget</option>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-light-900 dark:text-dark-900">
              Message
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="h-32 w-full rounded-md border border-light-300 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-100"
              placeholder="Describe the bug, feature request, or feedback..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !rawText.trim()}
            className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-0 hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Processing (LLM analyzing)..." : "Send Message"}
          </button>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-md bg-light-100 p-3 dark:bg-dark-100">
              <h3 className="mb-1 text-xs font-semibold text-light-900 dark:text-dark-900">
                Result
              </h3>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="text-light-800 dark:text-dark-800">
                    Thread:{" "}
                  </span>
                  <span className="font-mono">
                    {result.threadPublicId as string}
                  </span>
                  {result.isNewThread ? " (new)" : " (existing)"}
                </p>
                <p>
                  <span className="text-light-800 dark:text-dark-800">
                    Gatekeeper:{" "}
                  </span>
                  {(result.gatekeeper as Record<string, unknown>)
                    ?.shouldCreateWorkItem
                    ? "Created WorkItem"
                    : "No WorkItem"}
                  {" — "}
                  {
                    (result.gatekeeper as Record<string, unknown>)
                      ?.reason as string
                  }
                </p>
                {result.workItem && (
                  <p className="font-medium text-violet-600 dark:text-violet-400">
                    WorkItem created:{" "}
                    {
                      (result.workItem as Record<string, unknown>)
                        ?.publicId as string
                    }
                  </p>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onSuccess}
                  className="rounded bg-violet-600 px-3 py-1 text-xs text-white hover:bg-violet-700"
                >
                  Close & Refresh
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="rounded border border-light-300 px-3 py-1 text-xs dark:border-dark-300"
                >
                  Send Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
