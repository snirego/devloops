import { t } from "@lingui/core/macro";
import { useState } from "react";
import {
  HiCheck,
  HiClipboard,
  HiOutlineBookOpen,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineXMark,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useWorkspace } from "~/providers/workspace";

interface WidgetSetupModalProps {
  onClose: () => void;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-light-700 transition-colors hover:bg-light-300 hover:text-light-1000 dark:text-dark-700 dark:hover:bg-dark-400 dark:hover:text-dark-1000"
    >
      {copied ? (
        <>
          <HiCheck className="h-3 w-3 text-green-500" />
          {t`Copied!`}
        </>
      ) : (
        <>
          <HiClipboard className="h-3 w-3" />
          {t`Copy`}
        </>
      )}
    </button>
  );
}

function CodeBlock({ code, filename }: { code: string; filename?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-light-200 dark:border-dark-400">
      <div className="flex items-center justify-between bg-light-100 px-3 py-1.5 dark:bg-dark-200">
        {filename ? (
          <span className="font-mono text-[11px] text-light-700 dark:text-dark-700">
            {filename}
          </span>
        ) : (
          <span />
        )}
        <CopyButton code={code} />
      </div>
      <pre className="max-h-[200px] overflow-auto bg-light-50 p-3 font-mono text-xs leading-relaxed text-light-1000 dark:bg-dark-100 dark:text-dark-1000">
        {code}
      </pre>
    </div>
  );
}

type TabKey = "react" | "nextjs" | "html";

const TAB_LABELS: Record<TabKey, string> = {
  react: "React",
  nextjs: "Next.js",
  html: "HTML",
};

const TAB_ORDER: TabKey[] = ["nextjs", "react", "html"];

export default function WidgetSetupModal({ onClose }: WidgetSetupModalProps) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace.publicId;
  const [activeTab, setActiveTab] = useState<TabKey>("nextjs");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-devloops-instance.com";

  const tabs: Record<TabKey, { description: string; blocks: { filename?: string; code: string }[] }> = {
    react: {
      description: "Add this to your root component. The script loads once and renders a floating feedback button.",
      blocks: [
        {
          filename: "App.tsx",
          code: `import { useEffect } from "react";

function App() {
  useEffect(() => {
    if (document.getElementById("devloops-chat-script")) return;
    const s = document.createElement("script");
    s.id = "devloops-chat-script";
    s.src = "${baseUrl}/widget/devloops-chat.js";
    s.setAttribute("data-workspace-id", "${workspaceId}");
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return <>{/* Your app content */}</>;
}

export default App;`,
        },
      ],
    },
    nextjs: {
      description: "Use next/script for optimal loading. Add it to your root layout or _app file.",
      blocks: [
        {
          filename: "app/layout.tsx",
          code: `import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          id="devloops-chat"
          src="${baseUrl}/widget/devloops-chat.js"
          data-workspace-id="${workspaceId}"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}`,
        },
      ],
    },
    html: {
      description: "Add this script tag before the closing </body> tag. The widget will appear automatically.",
      blocks: [
        {
          filename: "index.html",
          code: `<!-- Devloops Feedback Widget -->
<script
  src="${baseUrl}/widget/devloops-chat.js"
  data-workspace-id="${workspaceId}"
  async>
</script>`,
        },
      ],
    },
  };

  const current = tabs[activeTab];

  return (
    <div>
      <div className="p-6 pb-0">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-light-100 text-lg dark:bg-dark-200">
            <HiOutlineChatBubbleLeftEllipsis className="h-5 w-5 text-brand-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-light-1000 dark:text-dark-1000">
              {t`Feedback Widget`}
            </h2>
            <p className="text-sm leading-snug text-light-900 dark:text-dark-900">
              {t`Add a feedback widget to your site — users can send feedback without leaving the page.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-light-600 transition-colors hover:bg-light-200 hover:text-light-900 dark:text-dark-600 dark:hover:bg-dark-300 dark:hover:text-dark-900"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs — fixed below header */}
        <div className="border-b border-light-200 dark:border-dark-400">
          <nav className="-mb-px flex gap-1">
            {TAB_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={twMerge(
                  "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === key
                    ? "border-light-1000 text-light-1000 dark:border-dark-1000 dark:text-dark-1000"
                    : "border-transparent text-light-600 hover:border-light-400 hover:text-light-900 dark:text-dark-600 dark:hover:border-dark-500 dark:hover:text-dark-900",
                )}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-4">
        <p className="mb-4 text-sm text-light-800 dark:text-dark-800">
          {current.description}
        </p>
        <div className="space-y-3">
          {current.blocks.map((block, idx) => (
            <CodeBlock
              key={`${activeTab}-${idx}`}
              code={block.code}
              filename={block.filename}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-light-200 px-6 py-3 dark:border-dark-300">
        <a
          href="https://docs.devloops.io/integrations/widget"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-light-600 transition-colors hover:text-light-900 dark:text-dark-600 dark:hover:text-dark-900"
        >
          <HiOutlineBookOpen className="h-3.5 w-3.5" />
          {t`Docs`}
        </a>
      </div>
    </div>
  );
}
