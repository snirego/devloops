import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineXMark,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export default function FeedbackWidget() {
  const { showPopup } = usePopup();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  const createFeedback = api.feedback.create.useMutation({
    onSuccess: () => {
      setMessage("");
      setIsOpen(false);
      showPopup({
        header: t`Feedback sent`,
        message: t`Thank you! We'll read it and get back to you.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to send`,
        message: t`Please try again or email us directly.`,
        icon: "error",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    createFeedback.mutate({
      feedback: text,
      url: typeof window !== "undefined" ? window.location.href : "",
    });
  };

  if (!mounted) return null;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={twMerge(
            "fixed bottom-6 right-6 z-[9990] flex items-center gap-2 rounded-full shadow-lg transition-all duration-200 ease-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-light-50 dark:focus-visible:ring-offset-dark-50",
            "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-xl hover:scale-105",
            "dark:bg-brand-500 dark:hover:bg-brand-600",
            isHovered ? "pl-4 pr-5" : "p-3",
          )}
          aria-label={t`Send feedback`}
        >
          <HiOutlineChatBubbleLeftRight className="h-5 w-5 flex-shrink-0" />
          {isHovered && (
            <span className="whitespace-nowrap text-sm font-medium">
              {t`Feedback`}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9996] bg-black/30 backdrop-blur-[2px] transition-opacity duration-200"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed bottom-0 right-0 z-[9997] flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-tl-2xl border border-b-0 border-r-0 border-light-200 bg-white shadow-2xl dark:border-dark-300 dark:bg-dark-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-widget-title"
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-light-200 bg-light-50/80 px-4 py-3 dark:border-dark-300 dark:bg-dark-200/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                  <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                </div>
                <div>
                  <h2
                    id="feedback-widget-title"
                    className="text-sm font-semibold text-light-900 dark:text-dark-900"
                  >
                    {t`Send feedback`}
                  </h2>
                  <p className="text-xs text-light-700 dark:text-dark-700">
                    {t`Share ideas or report issues — we read every message`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-light-600 transition-colors hover:bg-light-200 hover:text-light-900 dark:text-dark-600 dark:hover:bg-dark-300 dark:hover:text-dark-900"
                aria-label={t`Close`}
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 p-4"
            >
              <textarea
                id="feedback-widget-message"
                placeholder={t`What's on your mind? Ideas, bugs, feature requests...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsOpen(false);
                }}
                rows={5}
                className="w-full resize-none rounded-md border border-light-300 bg-white px-3 py-2 text-sm text-light-900 shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-light-600 focus:ring-2 focus:ring-brand-500 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900 dark:ring-dark-600 dark:placeholder:text-dark-600"
              />
              <Button
                type="submit"
                isLoading={createFeedback.isPending}
                disabled={!message.trim()}
              >
                {t`Send to team`}
              </Button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
