import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import {
  HiArrowTopRightOnSquare,
  HiMagnifyingGlass,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineCheckCircle,
  HiOutlineCpuChip,
  HiOutlineCommandLine,
  HiOutlineSignal,
} from "react-icons/hi2";
import {
  SiDiscord,
  SiSlack,
  SiIntercom,
  SiZendesk,
  SiOpenai,
  SiAnthropic,
  SiGoogle,
  SiGithub,
} from "react-icons/si";
import { twMerge } from "tailwind-merge";

import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

import type { IntegrationConfig } from "./components/IntegrationSetupModal";
import IntegrationSetupModal from "./components/IntegrationSetupModal";
import WidgetSetupModal from "./components/WidgetSetupModal";

// ---------------------------------------------------------------------------
// Integration definitions
// ---------------------------------------------------------------------------

const FEEDBACK_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Collect feedback from Slack channels.",
    longDescription: "Route Slack messages into Devloops as feedback.",
    icon: <SiSlack className="h-5 w-5 text-[#4A154B]" />,
    category: "feedback",
    docsUrl: "https://docs.devloops.io/integrations/slack",
    steps: [
      {
        title: "Create a Slack App",
        description:
          "You'll need a Slack App with the correct permissions to receive messages.",
        instructions: [
          "Go to `api.slack.com/apps` and click `Create New App`.",
          "Choose `From scratch` and give it a name (e.g. `Devloops Feedback`).",
          "Select the workspace you want to connect.",
          "Under `OAuth & Permissions`, add the `channels:history`, `channels:read`, and `chat:write` scopes.",
          "Install the app to your workspace.",
        ],
        helpUrl: "https://api.slack.com/apps",
        helpUrlLabel: "Open Slack App Dashboard",
      },
      {
        title: "Enter your credentials",
        description: "Paste the tokens from your newly created Slack App.",
        fields: [
          {
            key: "bot_token",
            label: "Bot User OAuth Token",
            placeholder: "xoxb-...",
            type: "password",
            helpText:
              "Found under OAuth & Permissions after installing the app.",
            helpUrl:
              "https://api.slack.com/authentication/token-types#bot",
          },
          {
            key: "channel_id",
            label: "Channel ID",
            placeholder: "C01AB2CDE3F",
            type: "text",
            helpText:
              "Right-click the channel > View channel details > copy the Channel ID from the bottom.",
          },
        ],
      },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Capture feedback from Discord channels.",
    longDescription: "Pull community feedback from Discord into Devloops.",
    icon: <SiDiscord className="h-5 w-5 text-[#5865F2]" />,
    category: "feedback",
    docsUrl: "https://docs.devloops.io/integrations/discord",
    steps: [
      {
        title: "Create a Discord Bot",
        description:
          "Register a bot on the Discord Developer Portal to read messages.",
        instructions: [
          "Go to `discord.com/developers/applications` and click `New Application`.",
          "Navigate to the `Bot` tab and click `Add Bot`.",
          "Enable `Message Content Intent` under `Privileged Gateway Intents`.",
          "Copy the bot token — you'll need it in the next step.",
          "Go to `OAuth2 > URL Generator`, select `bot` scope with `Read Messages/View Channels` permission, then invite the bot to your server.",
        ],
        helpUrl: "https://discord.com/developers/applications",
        helpUrlLabel: "Open Discord Developer Portal",
      },
      {
        title: "Connect your bot",
        description: "Paste the credentials from the Discord Developer Portal.",
        fields: [
          {
            key: "bot_token",
            label: "Bot Token",
            placeholder: "MTEyMz...",
            type: "password",
            helpText: "Found under the Bot tab of your application.",
          },
          {
            key: "channel_id",
            label: "Channel ID",
            placeholder: "1234567890123456789",
            type: "text",
            helpText:
              "Enable Developer Mode in Discord settings, then right-click the channel > Copy Channel ID.",
          },
        ],
      },
    ],
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Sync Intercom conversations as feedback.",
    longDescription: "Import Intercom threads into Devloops.",
    icon: <SiIntercom className="h-5 w-5 text-[#1F8DED]" />,
    category: "feedback",
    docsUrl: "https://docs.devloops.io/integrations/intercom",
    steps: [
      {
        title: "Generate an Intercom API token",
        description: "Create an access token from your Intercom Developer Hub.",
        instructions: [
          "Log in to your Intercom workspace.",
          "Go to `Settings > Integrations > Developer Hub`.",
          "Create a new app or select an existing one.",
          "Navigate to `Authentication` and generate an access token with `conversation read` permissions.",
        ],
        helpUrl: "https://developers.intercom.com/docs/build-an-integration",
        helpUrlLabel: "Intercom Developer Docs",
      },
      {
        title: "Paste your token",
        description:
          "Enter the access token so Devloops can pull conversations.",
        fields: [
          {
            key: "access_token",
            label: "Access Token",
            placeholder: "dG9rOjEy...",
            type: "password",
            helpText:
              "Your Intercom access token with conversation read permissions.",
          },
        ],
      },
    ],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Import Zendesk tickets as feedback.",
    longDescription: "Stream Zendesk tickets into Devloops.",
    icon: <SiZendesk className="h-5 w-5 text-[#03363D]" />,
    category: "feedback",
    docsUrl: "https://docs.devloops.io/integrations/zendesk",
    steps: [
      {
        title: "Get your Zendesk API credentials",
        description:
          "You'll need your subdomain and an API token from Zendesk.",
        instructions: [
          "Go to your `Zendesk Admin Center`.",
          "Navigate to `Apps and integrations > APIs > Zendesk API`.",
          "Enable `Token Access` and click `Add API token`.",
          "Copy the token — it will only be shown once.",
        ],
        helpUrl: "https://developer.zendesk.com/api-reference",
        helpUrlLabel: "Zendesk API Docs",
      },
      {
        title: "Enter Zendesk details",
        description: "Provide your subdomain and API credentials.",
        fields: [
          {
            key: "subdomain",
            label: "Zendesk Subdomain",
            placeholder: "your-company",
            type: "text",
            helpText:
              "The subdomain of your Zendesk account (e.g. \"your-company\" from your-company.zendesk.com).",
          },
          {
            key: "email",
            label: "Agent Email",
            placeholder: "agent@company.com",
            type: "text",
            helpText: "The email of the Zendesk agent associated with the API token.",
          },
          {
            key: "api_token",
            label: "API Token",
            placeholder: "abc123...",
            type: "password",
            helpText:
              "The API token you generated from Zendesk Admin Center.",
          },
        ],
      },
    ],
  },
  {
    id: "widget",
    name: "Feedback Widget",
    description: "Embed an in-app feedback widget.",
    longDescription: "Add a feedback widget to your site or app.",
    icon: (
      <HiOutlineChatBubbleLeftEllipsis className="h-5 w-5 text-brand-500" />
    ),
    category: "feedback",
    docsUrl: "https://docs.devloops.io/integrations/widget",
    steps: [],
  },
];

const LLM_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Use GPT models for AI features.",
    longDescription: "Power Devloops AI with your OpenAI key.",
    icon: <SiOpenai className="h-5 w-5 text-light-1000 dark:text-dark-1000" />,
    category: "llm",
    docsUrl: "https://docs.devloops.io/integrations/openai",
    steps: [
      {
        title: "Get your OpenAI API key",
        description:
          "Devloops uses the OpenAI API to power its AI features. You'll need an API key from your OpenAI account.",
        instructions: [
          "Go to `platform.openai.com` and sign in.",
          "Navigate to `API keys` in the left sidebar.",
          "Click `Create new secret key` and give it a descriptive name.",
          "Copy the key — it won't be shown again.",
          "Make sure your account has billing enabled with sufficient credits.",
        ],
        helpUrl: "https://platform.openai.com/api-keys",
        helpUrlLabel: "OpenAI API Keys",
      },
      {
        title: "Enter your API key",
        description:
          "Paste your OpenAI API key. We recommend using a project-scoped key for better security.",
        fields: [
          {
            key: "api_key",
            label: "API Key",
            placeholder: "sk-proj-...",
            type: "password",
            helpText:
              "Your OpenAI API key. Project-scoped keys (sk-proj-) are recommended.",
            helpUrl: "https://platform.openai.com/api-keys",
          },
          {
            key: "model",
            label: "Preferred Model",
            placeholder: "gpt-4o",
            type: "text",
            helpText:
              "The model to use for AI processing. Defaults to gpt-4o if left empty.",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Use Claude models for AI features.",
    longDescription: "Power Devloops AI with Anthropic Claude.",
    icon: <SiAnthropic className="h-5 w-5 text-[#D97757]" />,
    category: "llm",
    docsUrl: "https://docs.devloops.io/integrations/anthropic",
    steps: [
      {
        title: "Get your Anthropic API key",
        description:
          "Create an API key from the Anthropic Console to use Claude in Devloops.",
        instructions: [
          "Go to `console.anthropic.com` and sign in.",
          "Navigate to `Settings > API Keys`.",
          "Click `Create Key` and give it a name.",
          "Copy the key immediately — it won't be displayed again.",
          "Ensure your account has active billing.",
        ],
        helpUrl: "https://console.anthropic.com/settings/keys",
        helpUrlLabel: "Anthropic Console",
      },
      {
        title: "Enter your API key",
        description:
          "Paste your Anthropic API key to start using Claude for AI features.",
        fields: [
          {
            key: "api_key",
            label: "API Key",
            placeholder: "sk-ant-...",
            type: "password",
            helpText: "Your Anthropic API key.",
            helpUrl: "https://console.anthropic.com/settings/keys",
          },
          {
            key: "model",
            label: "Preferred Model",
            placeholder: "claude-sonnet-4-20250514",
            type: "text",
            helpText:
              "The Claude model to use. Defaults to Claude Sonnet if left empty.",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Use Gemini models for AI features.",
    longDescription: "Power Devloops AI with Google Gemini.",
    icon: <SiGoogle className="h-5 w-5 text-[#4285F4]" />,
    category: "llm",
    docsUrl: "https://docs.devloops.io/integrations/gemini",
    steps: [
      {
        title: "Get your Gemini API key",
        description:
          "Generate an API key from Google AI Studio to use Gemini in Devloops.",
        instructions: [
          "Go to `aistudio.google.com` and sign in with your Google account.",
          "Click `Get API key` in the top navigation.",
          "Create a new API key or use an existing one.",
          "Copy the key for the next step.",
        ],
        helpUrl: "https://aistudio.google.com/apikey",
        helpUrlLabel: "Google AI Studio",
      },
      {
        title: "Enter your API key",
        description: "Paste your Gemini API key.",
        fields: [
          {
            key: "api_key",
            label: "API Key",
            placeholder: "AIza...",
            type: "password",
            helpText: "Your Google Gemini API key from AI Studio.",
            helpUrl: "https://aistudio.google.com/apikey",
          },
          {
            key: "model",
            label: "Preferred Model",
            placeholder: "gemini-2.5-pro",
            type: "text",
            helpText:
              "The Gemini model to use. Defaults to Gemini 2.5 Pro if left empty.",
            required: false,
          },
        ],
      },
    ],
  },
];

const AGENT_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "cursor",
    name: "Cursor",
    description: "Auto-implement work items with Cursor.",
    longDescription: "Let Cursor's agent code from your backlog.",
    icon: <HiOutlineCommandLine className="h-5 w-5 text-[#00B4D8]" />,
    category: "agent",
    docsUrl: "https://docs.devloops.io/integrations/cursor",
    steps: [
      {
        title: "Enable Cursor Cloud Agent",
        description:
          "You'll need Cursor Pro or Business with the background agent feature enabled.",
        instructions: [
          "Open Cursor and make sure you're on a `Pro` or `Business` plan.",
          "Go to `Cursor Settings > Beta` and enable `Background Agent`.",
          "Navigate to `cursor.com/settings` and go to the `API Keys` section.",
          "Generate a new API key for Devloops.",
          "Copy the key — you'll paste it in the next step.",
        ],
        helpUrl: "https://docs.cursor.com/account/api-keys",
        helpUrlLabel: "Cursor API Key Docs",
      },
      {
        title: "Connect Cursor",
        description:
          "Enter your Cursor API key and repository information.",
        fields: [
          {
            key: "api_key",
            label: "Cursor API Key",
            placeholder: "cur_...",
            type: "password",
            helpText:
              "Your Cursor API key from cursor.com/settings.",
            helpUrl: "https://docs.cursor.com/account/api-keys",
          },
          {
            key: "repo_url",
            label: "Repository URL",
            placeholder: "https://github.com/org/repo",
            type: "url",
            helpText:
              "The GitHub repository the agent should work in.",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Implement tickets with Claude Code CLI.",
    longDescription: "Let Claude Code agent work on your tickets.",
    icon: <SiAnthropic className="h-5 w-5 text-[#D97757]" />,
    category: "agent",
    docsUrl: "https://docs.devloops.io/integrations/claude-code",
    steps: [
      {
        title: "Set up Claude Code",
        description:
          "Claude Code runs as a CLI tool. You'll need an Anthropic API key with Max plan access.",
        instructions: [
          "Install Claude Code: `npm install -g @anthropic-ai/claude-code`.",
          "Run `claude` in your terminal and authenticate with your Anthropic account.",
          "Make sure you have an active `Max` plan or API access.",
          "Generate a dedicated API key from `console.anthropic.com` for Devloops.",
        ],
        helpUrl: "https://docs.anthropic.com/en/docs/claude-code",
        helpUrlLabel: "Claude Code Docs",
      },
      {
        title: "Enter your credentials",
        description: "Provide the API key that Devloops will use to trigger Claude Code.",
        fields: [
          {
            key: "api_key",
            label: "Anthropic API Key",
            placeholder: "sk-ant-...",
            type: "password",
            helpText: "Your Anthropic API key with Claude Code access.",
            helpUrl: "https://console.anthropic.com/settings/keys",
          },
          {
            key: "repo_path",
            label: "Repository Path",
            placeholder: "/home/user/projects/my-app",
            type: "text",
            helpText:
              "The local path to the repository where Claude Code should operate.",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "codium",
    name: "Windsurf (Codium)",
    description: "AI-assisted coding with Windsurf.",
    longDescription: "Let Windsurf implement work items.",
    icon: <HiOutlineCpuChip className="h-5 w-5 text-[#6C63FF]" />,
    category: "agent",
    comingSoon: true,
    docsUrl: "https://docs.devloops.io/integrations/windsurf",
    steps: [
      {
        title: "Coming Soon",
        description:
          "Windsurf integration is under development. We'll notify you when it's available.",
        instructions: [
          "This integration is currently being built.",
          "Once available, you'll be able to connect your Windsurf account and allow it to work on Devloops tickets automatically.",
        ],
      },
    ],
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot Agent",
    description: "Implement work items with Copilot.",
    longDescription: "Let GitHub Copilot agent work on tickets.",
    icon: <SiGithub className="h-5 w-5 text-light-1000 dark:text-dark-1000" />,
    category: "agent",
    comingSoon: true,
    docsUrl: "https://docs.devloops.io/integrations/github-copilot",
    steps: [
      {
        title: "Coming Soon",
        description:
          "GitHub Copilot Agent integration is under development. Stay tuned!",
        instructions: [
          "This integration is currently being built.",
          "You'll be able to connect GitHub Copilot's agent mode to Devloops to auto-implement work items.",
        ],
      },
    ],
  },
];

const ALL_INTEGRATIONS = [
  ...FEEDBACK_INTEGRATIONS,
  ...LLM_INTEGRATIONS,
  ...AGENT_INTEGRATIONS,
];

// ---------------------------------------------------------------------------
// Section header component
// ---------------------------------------------------------------------------

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-light-100 dark:bg-dark-200">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold text-light-1000 dark:text-dark-1000">
          {title}
        </h2>
        <p className="text-xs text-light-700 dark:text-dark-700">
          {description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration card component
// ---------------------------------------------------------------------------

function IntegrationCard({
  integration,
  isConnected,
  onClick,
}: {
  integration: IntegrationConfig;
  isConnected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        "group relative flex w-full flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
        "hover:shadow-md hover:ring-1",
        isConnected
          ? "border-green-200 bg-green-50/50 hover:ring-green-300 dark:border-green-800/30 dark:bg-green-900/5 dark:hover:ring-green-700/50"
          : integration.comingSoon
            ? "cursor-default border-light-200 bg-light-50 opacity-65 dark:border-dark-300 dark:bg-dark-100"
            : "border-light-200 bg-white hover:ring-light-300 dark:border-dark-300 dark:bg-dark-100 dark:hover:ring-dark-500",
      )}
    >
      {/* Status badge */}
      {isConnected && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-800/30 dark:text-green-400">
          <HiOutlineCheckCircle className="h-3 w-3" />
          {t`Connected`}
        </span>
      )}
      {integration.comingSoon && !isConnected && (
        <span className="absolute right-3 top-3 rounded-full bg-light-200 px-2 py-0.5 text-[10px] font-semibold text-light-700 dark:bg-dark-300 dark:text-dark-700">
          {t`Coming Soon`}
        </span>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-light-100 transition-colors group-hover:bg-light-200 dark:bg-dark-200 dark:group-hover:bg-dark-300">
          {integration.icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
            {integration.name}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-xs leading-relaxed text-light-700 dark:text-dark-700">
        {integration.description}
      </p>

      {/* Footer */}
      <div className="mt-auto flex w-full items-center justify-between pt-1">
        <span
          className={twMerge(
            "text-xs font-medium",
            isConnected
              ? "text-green-600 dark:text-green-400"
              : integration.comingSoon
                ? "text-light-500 dark:text-dark-500"
                : "text-light-800 group-hover:text-light-1000 dark:text-dark-800 dark:group-hover:text-dark-1000",
          )}
        >
          {isConnected
            ? t`Manage`
            : integration.comingSoon
              ? t`Notify me`
              : t`Set up`}
        </span>
        {!integration.comingSoon && (
          <HiArrowTopRightOnSquare className="h-3.5 w-3.5 text-light-500 transition-colors group-hover:text-light-800 dark:text-dark-500 dark:group-hover:text-dark-800" />
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function IntegrationsSettings() {
  const { modalContentType, openModal, isOpen, closeModal } = useModal();
  const { showPopup } = usePopup();
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Track connected integrations in local state (persisted to localStorage)
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

  const persistConnected = (next: Record<string, boolean>) => {
    setConnected(next);
    localStorage.setItem("devloops_integrations", JSON.stringify(next));
  };

  const handleConnect = (_integrationId: string, _values: Record<string, string>) => {
    setIsSaving(true);
    // Simulate an API call – replace with real mutation later
    setTimeout(() => {
      const next = { ...connected, [_integrationId]: true };
      persistConnected(next);
      setIsSaving(false);
      closeModal();
        showPopup({
        header: t`Integration connected`,
        message: t`${ALL_INTEGRATIONS.find((i) => i.id === _integrationId)?.name ?? "Integration"} is now active.`,
          icon: "success",
        });
    }, 800);
  };

  const handleDisconnect = (integrationId: string) => {
    const next = { ...connected };
    delete next[integrationId];
    persistConnected(next);
    closeModal();
        showPopup({
      header: t`Integration disconnected`,
      message: t`${ALL_INTEGRATIONS.find((i) => i.id === integrationId)?.name ?? "Integration"} has been disconnected.`,
      icon: "success",
    });
  };

  // Filtering
  const matchesSearch = (i: IntegrationConfig) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q)
    );
  };

  const filteredFeedback = FEEDBACK_INTEGRATIONS.filter(matchesSearch);
  const filteredLlm = LLM_INTEGRATIONS.filter(matchesSearch);
  const filteredAgents = AGENT_INTEGRATIONS.filter(matchesSearch);
  const hasResults =
    filteredFeedback.length + filteredLlm.length + filteredAgents.length > 0;

  // Currently selected integration for the modal
  const selectedIntegration = ALL_INTEGRATIONS.find(
    (i) => modalContentType === `INTEGRATION_${i.id.toUpperCase()}`,
  );

  const connectedCount = Object.keys(connected).length;

  return (
    <>
      <PageHead title={t`Settings | Integrations`} />

      <div className="border-t border-light-300 dark:border-dark-300">
        {/* Page header with search */}
        <div className="mb-6 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-light-700 dark:text-dark-700">
              {t`Connect your tools to streamline the feedback-to-code pipeline.`}
              {connectedCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-800/30 dark:text-green-400">
                  <HiOutlineSignal className="h-3 w-3" />
                  {connectedCount}{" "}
                  {connectedCount === 1 ? t`active` : t`active`}
                </span>
              )}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-500 dark:text-dark-500" />
            <input
              type="text"
              placeholder={t`Search integrations...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-light-300 bg-light-50 py-2 pl-9 pr-3 text-sm text-light-1000 outline-none transition-colors placeholder:text-light-500 focus:border-light-500 focus:ring-1 focus:ring-light-500 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:placeholder:text-dark-600 dark:focus:border-dark-600 dark:focus:ring-dark-600"
            />
          </div>
        </div>

        {!hasResults && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HiMagnifyingGlass className="mb-3 h-8 w-8 text-light-400 dark:text-dark-400" />
            <p className="text-sm font-medium text-light-700 dark:text-dark-700">
              {t`No integrations found`}
            </p>
            <p className="mt-1 text-xs text-light-500 dark:text-dark-500">
              {t`Try a different search term.`}
            </p>
          </div>
        )}

        {/* Feedback Sources */}
        {filteredFeedback.length > 0 && (
          <section className="mb-8">
            <SectionHeader
              icon={
                <HiOutlineChatBubbleLeftEllipsis className="h-4 w-4 text-light-800 dark:text-dark-800" />
              }
              title={t`Feedback Sources`}
              description={t`Connect platforms where your users leave feedback to automatically collect and process it.`}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFeedback.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  isConnected={Boolean(connected[integration.id])}
                  onClick={() => {
                    if (!integration.comingSoon) {
                      openModal(
                        `INTEGRATION_${integration.id.toUpperCase()}`,
                      );
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* LLM Models */}
        {filteredLlm.length > 0 && (
          <section className="mb-8">
            <SectionHeader
              icon={
                <HiOutlineCpuChip className="h-4 w-4 text-light-800 dark:text-dark-800" />
              }
              title={t`LLM Models`}
              description={t`Control which AI models turn feedback into tickets, prioritize work, and generate summaries.`}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLlm.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  isConnected={Boolean(connected[integration.id])}
                  onClick={() => {
                    if (!integration.comingSoon) {
                      openModal(
                        `INTEGRATION_${integration.id.toUpperCase()}`,
                      );
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Coding Agents */}
        {filteredAgents.length > 0 && (
          <section className="mb-8">
            <SectionHeader
              icon={
                <HiOutlineCommandLine className="h-4 w-4 text-light-800 dark:text-dark-800" />
              }
              title={t`Coding Agents`}
              description={t`Connect vibe-coding agents that can autonomously implement work items from your backlog.`}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  isConnected={Boolean(connected[integration.id])}
                  onClick={() => {
                    if (!integration.comingSoon) {
                      openModal(
                        `INTEGRATION_${integration.id.toUpperCase()}`,
                      );
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Widget custom modal */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "INTEGRATION_WIDGET"}
      >
        <WidgetSetupModal onClose={closeModal} />
      </Modal>

      {/* Generic integration setup modal */}
      {selectedIntegration && selectedIntegration.id !== "widget" && (
        <Modal
          modalSize="md"
          isVisible={
            isOpen &&
            modalContentType ===
              `INTEGRATION_${selectedIntegration.id.toUpperCase()}`
          }
        >
          <IntegrationSetupModal
            integration={selectedIntegration}
            onClose={closeModal}
            onComplete={handleConnect}
            isConnected={Boolean(connected[selectedIntegration.id])}
            onDisconnect={() => handleDisconnect(selectedIntegration.id)}
            isSaving={isSaving}
          />
        </Modal>
      )}

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
