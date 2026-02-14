/**
 * GitHub integration — create issues from WorkItems.
 *
 * Uses a personal access token for local testing.
 * Env: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME
 */

import type { PromptBundleJson, ThreadStateJson } from "@kan/db/schema";

interface GitHubIssueInput {
  title: string;
  structuredDescription: string;
  acceptanceCriteria: string[];
  threadState: ThreadStateJson;
  promptBundle: PromptBundleJson | null;
  workItemPublicId: string;
}

interface GitHubIssueResponse {
  html_url: string;
  number: number;
}

function getGitHubConfig() {
  return {
    token: process.env.GITHUB_TOKEN ?? "",
    owner: process.env.GITHUB_REPO_OWNER ?? "",
    repo: process.env.GITHUB_REPO_NAME ?? "",
  };
}

export function isGitHubConfigured(): boolean {
  const config = getGitHubConfig();
  return !!(config.token && config.owner && config.repo);
}

export async function createGitHubIssue(
  input: GitHubIssueInput,
): Promise<{ url: string; number: number }> {
  const config = getGitHubConfig();

  if (!config.token || !config.owner || !config.repo) {
    throw new Error(
      "GitHub not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME.",
    );
  }

  const env = input.threadState.knownEnvironment;
  const envLines = Object.entries(env)
    .filter(([, v]) => v)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");

  const reproSteps = input.threadState.reproSteps
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  const acceptanceCriteria = input.acceptanceCriteria
    .map((c) => `- [ ] ${c}`)
    .join("\n");

  const promptSummary = input.promptBundle
    ? `<details>
<summary>Agent Prompt Summary</summary>

**Suspected files:** ${input.promptBundle.suspectedFiles.join(", ") || "N/A"}

**Tests to run:** ${input.promptBundle.testsToRun.join(", ") || "N/A"}

**Commands:** ${input.promptBundle.commands.join(", ") || "N/A"}

</details>`
    : "";

  const body = `## Description

${input.structuredDescription}

## Environment

${envLines || "Not specified"}

## Reproduction Steps

${reproSteps || "Not provided"}

## Expected vs Actual

- **Expected**: ${input.threadState.expectedBehavior ?? "Not specified"}
- **Actual**: ${input.threadState.actualBehavior ?? "Not specified"}

## Acceptance Criteria

${acceptanceCriteria || "Not specified"}

## Thread Summary

${input.threadState.summary}

${promptSummary}

---
*Generated from WorkItem \`${input.workItemPublicId}\`*`;

  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: input.title,
        body,
        labels: ["auto-generated"],
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `GitHub API error (${response.status}): ${errBody.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as GitHubIssueResponse;
  return { url: data.html_url, number: data.number };
}
