import type { NextApiRequest, NextApiResponse } from "next";

import { createDrizzleClient } from "@kan/db/client";
import * as chatSessionRepo from "@kan/db/repository/chatSession.repo";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = createDrizzleClient();
    const { sessionId, threadPublicId, visitorName, visitorEmail, metadata, workspacePublicId } =
      req.body ?? {};

    // Resolve workspace ID if provided
    let workspaceId: number | undefined;
    if (workspacePublicId) {
      const ws = await workspaceRepo.getByPublicId(db, workspacePublicId);
      if (ws) workspaceId = ws.id;
    }

    // Resume existing session
    if (sessionId) {
      const session = await chatSessionRepo.getByPublicId(db, sessionId);
      if (session) {
        await chatSessionRepo.updateLastSeen(db, session.id);
        if (visitorName || visitorEmail) {
          await chatSessionRepo.updateVisitorInfo(db, session.id, {
            visitorName,
            visitorEmail,
          });
        }
        // Fetch thread publicId
        const existingThread = await feedbackThreadRepo.getById(
          db,
          session.threadId,
        );
        return res.status(200).json({
          sessionId: session.publicId,
          threadPublicId: existingThread?.publicId ?? null,
          threadId: existingThread?.id ?? session.threadId,
        });
      }
    }

    // If a threadPublicId was provided, attach to that existing thread
    // (visitor joining a shared chat link)
    if (threadPublicId) {
      const existingThread = await feedbackThreadRepo.getByPublicId(
        db,
        threadPublicId,
      );
      if (existingThread) {
        const session = await chatSessionRepo.create(db, {
          threadId: existingThread.id,
          visitorName: visitorName ?? null,
          visitorEmail: visitorEmail ?? null,
          metadataJson: metadata ?? {},
        });
        return res.status(201).json({
          sessionId: session.publicId,
          threadPublicId: existingThread.publicId,
          threadId: existingThread.id,
        });
      }
      // Thread not found — fall through to create a new one
    }

    // Create new thread + session (widget inbox / fallback)
    const thread = await feedbackThreadRepo.create(db, {
      primarySource: "widget",
      title: visitorName ? `Chat with ${visitorName}` : "New Chat",
      ...(workspaceId ? { workspaceId } : {}),
    });

    const session = await chatSessionRepo.create(db, {
      threadId: thread.id,
      visitorName: visitorName ?? null,
      visitorEmail: visitorEmail ?? null,
      metadataJson: metadata ?? {},
    });

    return res.status(201).json({
      sessionId: session.publicId,
      threadPublicId: thread.publicId,
      threadId: thread.id,
    });
  } catch (err) {
    console.error("[Chat Session API]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
