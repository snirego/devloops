import type { NextApiRequest, NextApiResponse } from "next";

import type { ThreadStateJson } from "@kan/db/schema";
import { runIngestPipelineAsync } from "@kan/api/utils/llmJobs";
import { createDrizzleClient } from "@kan/db/client";
import * as chatSessionRepo from "@kan/db/repository/chatSession.repo";
import * as feedbackMessageRepo from "@kan/db/repository/feedbackMessage.repo";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Session-Id");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const db = createDrizzleClient();
  const sessionId =
    (req.headers["x-session-id"] as string) ??
    (req.query.sessionId as string);

  if (!sessionId) {
    return res.status(400).json({ error: "Missing session ID" });
  }

  const session = await chatSessionRepo.getByPublicId(db, sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  await chatSessionRepo.updateLastSeen(db, session.id);

  // ── GET: list public messages ─────────────────────────────────────────
  if (req.method === "GET") {
    const messages = await feedbackMessageRepo.getByThreadIdPublic(
      db,
      session.threadId,
    );

    return res.status(200).json({
      messages: messages.map((m) => ({
        publicId: m.publicId,
        senderType: m.senderType,
        senderName: m.senderName,
        rawText: m.rawText,
        createdAt: m.createdAt,
        metadataJson: m.metadataJson,
      })),
    });
  }

  // ── POST: send a message ──────────────────────────────────────────────
  if (req.method === "POST") {
    const { rawText, senderName, publicId } = req.body ?? {};

    if (!rawText || typeof rawText !== "string" || rawText.length === 0) {
      return res.status(400).json({ error: "rawText is required" });
    }

    // Update visitor name if provided
    if (senderName) {
      await chatSessionRepo.updateVisitorInfo(db, session.id, {
        visitorName: senderName,
      });
    }

    const message = await feedbackMessageRepo.create(db, {
      threadId: session.threadId,
      source: "widget",
      senderType: "user",
      senderName: senderName ?? session.visitorName ?? "Visitor",
      visibility: "public",
      rawText,
      metadataJson: {},
      publicId: publicId ?? undefined,
    });

    // Get thread for LLM pipeline
    const thread = await feedbackThreadRepo.getById(db, session.threadId);

    // Fire LLM pipeline async (non-blocking)
    if (thread) {
      runIngestPipelineAsync(
        db,
        thread.id,
        (thread.threadStateJson as ThreadStateJson) ?? null,
        rawText,
        undefined,
        message.id,
      );
    }

    return res.status(201).json({
      messagePublicId: message.publicId,
      threadPublicId: thread?.publicId ?? null,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
