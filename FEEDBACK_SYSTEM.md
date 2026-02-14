# Feedback → WorkItem System

A conversation-aware, developer-first feedback system where a **Thread** becomes one or more executable **WorkItems**. Everything runs locally — no paid APIs, no external keys.

## Architecture Overview

```
Message → Thread (threading logic)
              ↓
         LLM Job A: Update ThreadState (cumulative)
              ↓
         LLM Job B: Gatekeeper (should we create a WorkItem?)
              ↓ (only if confidence >= 0.7)
         LLM Job C: Generate WorkItem with prompt bundle
              ↓
         WorkItem → PendingApproval → Approved → InProgress → Done
                                       ↓
                               Optional: Create GitHub Issue
```

## Local LLM Setup

### Option 1: Ollama (Recommended)

**Step 1** — Install Ollama from https://ollama.com

**Step 2** — Start Ollama service:
- On macOS it auto-starts after install
- On Linux/Windows: `ollama serve`

**Step 3** — Pull a model:
```bash
ollama pull qwen2.5-coder:7b-instruct
```

**Step 4** — Quick test:
```bash
ollama run qwen2.5-coder:7b-instruct "Say hello"
```

**Step 5** — Verify the OpenAI-compatible endpoint is reachable:
```bash
curl http://localhost:11434/v1/models
```

**Step 6** — Add to your `.env`:
```env
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=qwen2.5-coder:7b-instruct
LOCAL_LLM_API_KEY=ollama
```

### Option 2: llama-cpp-python (Fallback)

```bash
pip install llama-cpp-python
```

Download a GGUF model file (e.g. Qwen2.5-Coder-Instruct GGUF from Hugging Face), place it under `./models/`.

Run server:
```bash
python -m llama_cpp.server --model ./models/your_model.gguf --host 0.0.0.0 --port 8000
```

Then set:
```env
LOCAL_LLM_BASE_URL=http://localhost:8000/v1
LOCAL_LLM_MODEL=your_model_name
LOCAL_LLM_API_KEY=dummy
```

## Environment Variables

Add these to your root `.env` file:

```env
# ── Local LLM (required for feedback system) ──
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=qwen2.5-coder:7b-instruct
LOCAL_LLM_API_KEY=ollama

# ── GitHub Integration (optional) ──
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=your-repo
```

## Database Migration

After pulling the code, run:
```bash
pnpm db:migrate
```

This creates the new tables: `feedback_thread`, `feedback_message`, `work_item`, `audit_log`.

## Running Locally

```bash
# 1. Start Ollama (if not auto-started)
ollama serve

# 2. Start the dev server
pnpm dev
```

Navigate to `/work-items` in the sidebar to see the kanban board.

## API Endpoints

### Ingest a Message

```bash
# First message — creates a new Thread
curl -X POST http://localhost:3000/api/trpc/feedbackThread.ingest \
  -H "Content-Type: application/json" \
  -d '{"json":{"source":"api","customerId":"user-42","rawText":"When I try to drag a card from one list to another, the card disappears completely. I am using Chrome on macOS Sonoma 14.2. This happens every time I drag a card to the third list on any board."}}'
```

```bash
# Second message — same customer, appends to existing Thread
curl -X POST http://localhost:3000/api/trpc/feedbackThread.ingest \
  -H "Content-Type: application/json" \
  -d '{"json":{"source":"api","customerId":"user-42","rawText":"I just checked and it also happens in Firefox. The card data is still in the database but the UI does not show it after the drop. Console shows a React error about invalid index."}}'
```

### Get Thread with ThreadState

```bash
curl "http://localhost:3000/api/trpc/feedbackThread.byPublicId?input=%7B%22json%22%3A%7B%22publicId%22%3A%22THREAD_PUBLIC_ID%22%7D%7D"
```

### List Work Items

```bash
curl "http://localhost:3000/api/trpc/workItem.list"
```

### Get a Work Item

```bash
curl "http://localhost:3000/api/trpc/workItem.byPublicId?input=%7B%22json%22%3A%7B%22publicId%22%3A%22WORKITEM_PUBLIC_ID%22%7D%7D"
```

### Approve a Work Item

```bash
curl -X POST http://localhost:3000/api/trpc/workItem.approve \
  -H "Content-Type: application/json" \
  -d '{"json":{"publicId":"WORKITEM_PUBLIC_ID"}}'
```

### Reject a Work Item

```bash
curl -X POST http://localhost:3000/api/trpc/workItem.reject \
  -H "Content-Type: application/json" \
  -d '{"json":{"publicId":"WORKITEM_PUBLIC_ID","reason":"Not enough repro info"}}'
```

### Create GitHub Issue from Approved WorkItem

```bash
curl -X POST http://localhost:3000/api/trpc/workItem.createGithubIssue \
  -H "Content-Type: application/json" \
  -d '{"json":{"publicId":"WORKITEM_PUBLIC_ID"}}'
```

### Prepare Agent (stub)

```bash
curl -X POST http://localhost:3000/api/trpc/workItem.prepareAgent \
  -H "Content-Type: application/json" \
  -d '{"json":{"publicId":"WORKITEM_PUBLIC_ID"}}'
```

### Check LLM Health

```bash
curl "http://localhost:3000/api/trpc/feedbackThread.llmHealth"
```

## File Tree (New & Modified)

### New Files

```
packages/db/src/schema/feedbackThreads.ts          — Schema: Thread, Message, WorkItem, AuditLog + enums + TS types
packages/db/src/repository/feedbackThread.repo.ts   — Thread repo (CRUD, threading logic, state update)
packages/db/src/repository/feedbackMessage.repo.ts  — Message repo (create, list by thread)
packages/db/src/repository/workItem.repo.ts         — WorkItem repo (CRUD, status, links, execution, prompts)
packages/db/src/repository/auditLog.repo.ts         — AuditLog repo (create, query by entity)
packages/db/migrations/XXXXX_AddFeedbackThreadsWorkItems.sql — Migration

packages/api/src/utils/llm.ts                       — Local LLM client (OpenAI-compat, JSON repair, retry)
packages/api/src/utils/llmJobs.ts                   — Jobs A/B/C + full pipeline
packages/api/src/utils/github.ts                    — GitHub issue creation
packages/api/src/routers/feedbackThread.ts          — tRPC router: ingest, list, get, llmHealth
packages/api/src/routers/workItem.ts                — tRPC router: CRUD, status workflow, GitHub, agent stub

apps/web/src/pages/work-items/index.tsx             — Work Items page
apps/web/src/views/work-items/index.tsx             — Kanban board view
apps/web/src/views/work-items/components/WorkItemCard.tsx    — Card component
apps/web/src/views/work-items/components/WorkItemDrawer.tsx  — Detail drawer + actions
apps/web/src/views/work-items/components/IngestPanel.tsx     — Message ingest modal

FEEDBACK_SYSTEM.md                                  — This documentation
```

### Modified Files

```
packages/db/src/schema/index.ts                     — Added feedbackThreads export
packages/api/src/root.ts                            — Registered feedbackThread + workItem routers
apps/web/src/components/SideNavigation.tsx           — Added "Work Items" nav link
turbo.json                                          — Added LLM + GitHub env vars to globalEnv
```

## WorkItem Lifecycle

```
Draft → PendingApproval → Approved → InProgress → NeedsReview → Done
                       ↘ Rejected                ↘ Failed
                       ↘ OnHold                   ↘ OnHold
                       ↘ Canceled                 ↘ Canceled
```

## Key Design Decisions

1. **Thread-first**: Messages accumulate in a Thread. ThreadState is updated cumulatively — every fact from every message is preserved.

2. **Gatekeeper is conservative**: Default is NoTicket. WorkItems are only created when the LLM recommends it with confidence >= 0.7.

3. **Approval required**: WorkItems start as PendingApproval. No GitHub actions until explicitly approved.

4. **Prompt bundle is editable**: The cursor_prompt can be edited before approval, making it a review-then-execute workflow.

5. **Strict JSON validation**: LLM outputs are validated against schemas. If parsing fails, the system applies minimal JSON repair and retries once. Failures are logged to audit_log.

6. **Local only**: No paid APIs. Everything runs through a local OpenAI-compatible endpoint (Ollama or llama-cpp-python).
