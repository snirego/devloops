import { t } from "@lingui/core/macro";
import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineCodeBracketSquare,
  HiOutlineCommandLine,
  HiOutlineCpuChip,
} from "react-icons/hi2";
import {
  SiAnthropic,
  SiBitbucket,
  SiDiscord,
  SiGithub,
  SiGitlab,
  SiGoogle,
  SiIntercom,
  SiOpenai,
  SiSlack,
  SiZendesk,
} from "react-icons/si";
import { twMerge } from "tailwind-merge";

import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrationUsage {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: "feedback" | "llm" | "agent" | "codebase";
  isConnected: boolean;
  requests: number;
  tokensUsed: number;
  itemsProcessed: number;
  lastUsed: string | null;
  dailyData: number[];
}

type TimePeriod = "7d" | "30d" | "90d";

// ---------------------------------------------------------------------------
// Mock data generator (replace with real API later)
// ---------------------------------------------------------------------------

function generateMockDailyData(days: number, max: number): number[] {
  return Array.from({ length: days }, () =>
    Math.floor(Math.random() * max),
  );
}

function getIntegrationDefinitions(connected: Record<string, boolean>): IntegrationUsage[] {
  const defs: Omit<IntegrationUsage, "isConnected" | "requests" | "tokensUsed" | "itemsProcessed" | "lastUsed" | "dailyData">[] = [
    { id: "slack", name: "Slack", icon: <SiSlack className="h-4 w-4 text-[#4A154B]" />, category: "feedback" },
    { id: "discord", name: "Discord", icon: <SiDiscord className="h-4 w-4 text-[#5865F2]" />, category: "feedback" },
    { id: "intercom", name: "Intercom", icon: <SiIntercom className="h-4 w-4 text-[#1F8DED]" />, category: "feedback" },
    { id: "zendesk", name: "Zendesk", icon: <SiZendesk className="h-4 w-4 text-[#03363D]" />, category: "feedback" },
    { id: "openai", name: "OpenAI", icon: <SiOpenai className="h-4 w-4 text-light-1000 dark:text-dark-1000" />, category: "llm" },
    { id: "anthropic", name: "Anthropic", icon: <SiAnthropic className="h-4 w-4 text-[#D97757]" />, category: "llm" },
    { id: "gemini", name: "Google Gemini", icon: <SiGoogle className="h-4 w-4 text-[#4285F4]" />, category: "llm" },
    { id: "cursor", name: "Cursor", icon: <HiOutlineCommandLine className="h-4 w-4 text-[#00B4D8]" />, category: "agent" },
    { id: "claude-code", name: "Claude Code", icon: <SiAnthropic className="h-4 w-4 text-[#D97757]" />, category: "agent" },
    { id: "github", name: "GitHub", icon: <SiGithub className="h-4 w-4 text-light-1000 dark:text-dark-1000" />, category: "codebase" },
    { id: "gitlab", name: "GitLab", icon: <SiGitlab className="h-4 w-4 text-[#FC6D26]" />, category: "codebase" },
    { id: "bitbucket", name: "Bitbucket", icon: <SiBitbucket className="h-4 w-4 text-[#0052CC]" />, category: "codebase" },
  ];

  return defs.map((def) => {
    const isConn = Boolean(connected[def.id]);
    const requests = isConn ? Math.floor(Math.random() * 2000) + 100 : 0;
    const tokensUsed = def.category === "llm" && isConn ? Math.floor(Math.random() * 500000) + 10000 : 0;
    const itemsProcessed = isConn ? Math.floor(Math.random() * 500) + 10 : 0;
    return {
      ...def,
      isConnected: isConn,
      requests,
      tokensUsed,
      itemsProcessed,
      lastUsed: isConn ? new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString() : null,
      dailyData: isConn ? generateMockDailyData(30, Math.floor(requests / 15)) : generateMockDailyData(30, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Tiny inline bar chart
// ---------------------------------------------------------------------------

function MiniBarChart({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className={twMerge("flex items-end gap-[2px]", className)}>
      {data.map((value, i) => (
        <div
          key={i}
          className="w-[4px] min-w-[3px] flex-1 rounded-sm bg-brand-400 transition-all dark:bg-brand-500"
          style={{ height: `${Math.max((value / max) * 100, 4)}%` }}
          title={`${value}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-light-200 bg-white p-4 dark:border-dark-300 dark:bg-dark-100">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-light-100 dark:bg-dark-200">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-light-700 dark:text-dark-700">{label}</p>
        <p className="text-xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
          {value}
        </p>
        {subtext && (
          <p className="mt-0.5 text-[10px] text-light-600 dark:text-dark-600">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category icon helper
// ---------------------------------------------------------------------------

function categoryIcon(category: string) {
  switch (category) {
    case "feedback":
      return <HiOutlineChatBubbleLeftEllipsis className="h-3.5 w-3.5" />;
    case "llm":
      return <HiOutlineCpuChip className="h-3.5 w-3.5" />;
    case "agent":
      return <HiOutlineCommandLine className="h-3.5 w-3.5" />;
    case "codebase":
      return <HiOutlineCodeBracketSquare className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function categoryLabel(category: string) {
  switch (category) {
    case "feedback":
      return t`Feedback`;
    case "llm":
      return t`LLM`;
    case "agent":
      return t`Agent`;
    case "codebase":
      return t`Codebase`;
    default:
      return category;
  }
}

// ---------------------------------------------------------------------------
// Number formatting helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t`Just now`;
  if (minutes < 60) return t`${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t`${hours}h ago`;
  const days = Math.floor(hours / 24);
  return t`${days}d ago`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UsageSettings() {
  const { modalContentType, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load connected integrations from localStorage (same source as IntegrationsSettings)
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("devloops_integrations");
      if (stored) {
        setConnected(JSON.parse(stored) as Record<string, boolean>);
      }
    } catch {
      // ignore
    }
  }, []);

  const integrations = useMemo(
    () => getIntegrationDefinitions(connected),
    [connected],
  );

  const connectedIntegrations = integrations.filter((i) => i.isConnected);
  const disconnectedIntegrations = integrations.filter((i) => !i.isConnected);

  // Aggregate stats
  const totalRequests = connectedIntegrations.reduce((sum, i) => sum + i.requests, 0);
  const totalTokens = connectedIntegrations.reduce((sum, i) => sum + i.tokensUsed, 0);
  const totalItemsProcessed = connectedIntegrations.reduce((sum, i) => sum + i.itemsProcessed, 0);
  const activeCount = connectedIntegrations.length;

  const periodLabel =
    period === "7d"
      ? t`Last 7 days`
      : period === "30d"
        ? t`Last 30 days`
        : t`Last 90 days`;

  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 90;

  return (
    <>
      <PageHead title={t`Settings | Usage`} />

      <div className="border-t border-light-300 dark:border-dark-300">
        {/* Header */}
        <div className="mb-6 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-light-700 dark:text-dark-700">
              {t`Monitor API requests, token consumption, and integration activity for`}{" "}
              <span className="font-medium text-light-1000 dark:text-dark-1000">
                {workspace.name || t`your workspace`}
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-light-300 bg-light-50 p-0.5 dark:border-dark-400 dark:bg-dark-100">
            {(["7d", "30d", "90d"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={twMerge(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  period === p
                    ? "bg-white text-light-1000 shadow-sm dark:bg-dark-300 dark:text-dark-1000"
                    : "text-light-700 hover:text-light-1000 dark:text-dark-700 dark:hover:text-dark-1000",
                )}
              >
                {p === "7d" ? t`7D` : p === "30d" ? t`30D` : t`90D`}
              </button>
            ))}
          </div>
        </div>

        {/* Overview stat cards */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t`Total Requests`}
            value={formatNumber(totalRequests)}
            subtext={periodLabel}
            icon={<HiOutlineChartBar className="h-4 w-4 text-brand-500" />}
          />
          <StatCard
            label={t`Tokens Used`}
            value={formatNumber(totalTokens)}
            subtext={t`Across all LLM providers`}
            icon={<HiOutlineCpuChip className="h-4 w-4 text-violet-500" />}
          />
          <StatCard
            label={t`Items Processed`}
            value={formatNumber(totalItemsProcessed)}
            subtext={t`Feedback, tickets & work items`}
            icon={
              <HiOutlineChatBubbleLeftEllipsis className="h-4 w-4 text-emerald-500" />
            }
          />
          <StatCard
            label={t`Active Integrations`}
            value={String(activeCount)}
            subtext={t`${integrations.length} total available`}
            icon={
              <HiOutlineCodeBracketSquare className="h-4 w-4 text-amber-500" />
            }
          />
        </div>

        {/* Connected integrations – detailed table */}
        {connectedIntegrations.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold text-light-1000 dark:text-dark-1000">
              {t`Active Integrations`}
            </h2>
            <div className="overflow-hidden rounded-xl border border-light-200 dark:border-dark-300">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-light-200 bg-light-50 dark:border-dark-300 dark:bg-dark-100">
                    <th className="px-4 py-3 font-medium text-light-700 dark:text-dark-700">
                      {t`Integration`}
                    </th>
                    <th className="hidden px-4 py-3 font-medium text-light-700 dark:text-dark-700 sm:table-cell">
                      {t`Category`}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-light-700 dark:text-dark-700">
                      {t`Requests`}
                    </th>
                    <th className="hidden px-4 py-3 text-right font-medium text-light-700 dark:text-dark-700 md:table-cell">
                      {t`Tokens`}
                    </th>
                    <th className="hidden px-4 py-3 text-right font-medium text-light-700 dark:text-dark-700 md:table-cell">
                      {t`Items`}
                    </th>
                    <th className="hidden px-4 py-3 text-right font-medium text-light-700 dark:text-dark-700 lg:table-cell">
                      {t`Activity`}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-light-700 dark:text-dark-700">
                      {t`Last Used`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {connectedIntegrations.map((integration) => {
                    const isExpanded = expandedId === integration.id;
                    return (
                      <tr
                        key={integration.id}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : integration.id)
                        }
                        className={twMerge(
                          "cursor-pointer border-b border-light-100 transition-colors last:border-b-0 hover:bg-light-50 dark:border-dark-200 dark:hover:bg-dark-50/50",
                          isExpanded && "bg-light-50 dark:bg-dark-50/50",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-light-100 dark:bg-dark-200">
                              {integration.icon}
                            </div>
                            <span className="font-medium text-light-1000 dark:text-dark-1000">
                              {integration.name}
                            </span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-light-100 px-2 py-0.5 text-[10px] font-medium text-light-800 dark:bg-dark-200 dark:text-dark-800">
                            {categoryIcon(integration.category)}
                            {categoryLabel(integration.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-light-1000 dark:text-dark-1000">
                          {formatNumber(integration.requests)}
                        </td>
                        <td className="hidden px-4 py-3 text-right font-mono text-light-1000 dark:text-dark-1000 md:table-cell">
                          {integration.tokensUsed > 0
                            ? formatNumber(integration.tokensUsed)
                            : "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-right font-mono text-light-1000 dark:text-dark-1000 md:table-cell">
                          {formatNumber(integration.itemsProcessed)}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          <MiniBarChart
                            data={integration.dailyData.slice(-periodDays)}
                            className="ml-auto h-6 w-24"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-light-700 dark:text-dark-700">
                          {integration.lastUsed
                            ? formatRelativeTime(integration.lastUsed)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Disconnected integrations */}
        {disconnectedIntegrations.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold text-light-1000 dark:text-dark-1000">
              {t`Inactive Integrations`}
            </h2>
            <p className="mb-3 text-xs text-light-600 dark:text-dark-600">
              {t`Connect these integrations from the`}{" "}
              <a
                href="/settings/integrations"
                className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {t`Integrations`}
              </a>{" "}
              {t`page to start tracking their usage.`}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {disconnectedIntegrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-light-200 px-3 py-2.5 dark:border-dark-400"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-light-100 opacity-50 dark:bg-dark-200">
                    {integration.icon}
                  </div>
                  <span className="truncate text-xs text-light-500 dark:text-dark-500">
                    {integration.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state when nothing is connected */}
        {connectedIntegrations.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-light-300 py-16 text-center dark:border-dark-400">
            <HiOutlineChartBar className="mb-3 h-8 w-8 text-light-400 dark:text-dark-400" />
            <p className="text-sm font-medium text-light-700 dark:text-dark-700">
              {t`No usage data yet`}
            </p>
            <p className="mt-1 max-w-xs text-xs text-light-500 dark:text-dark-500">
              {t`Connect your first integration to start tracking usage. Head to the Integrations tab to get started.`}
            </p>
            <a
              href="/settings/integrations"
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-600"
            >
              {t`Set up integrations`}
            </a>
          </div>
        )}
      </div>

      {/* Global modals */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
      >
        <FeedbackModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}
