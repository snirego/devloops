import type { NextApiRequest, NextApiResponse } from "next";

import { createDrizzleClient } from "@kan/db/client";
import * as feedbackMessageRepo from "@kan/db/repository/feedbackMessage.repo";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = createDrizzleClient();
    const { publicId } = req.query;

    if (!publicId || typeof publicId !== "string") {
      return res.status(400).json({ error: "Missing publicId" });
    }

    const thread = await feedbackThreadRepo.getByPublicId(db, publicId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    // Only return public messages for the public API
    const messages = await feedbackMessageRepo.getByThreadIdPublic(
      db,
      thread.id,
    );

    return res.status(200).json({
      thread: {
        id: thread.id,
        publicId: thread.publicId,
        title: thread.title,
        status: thread.status,
        lastActivityAt: thread.lastActivityAt,
        createdAt: thread.createdAt,
      },
      messages: messages.map((m) => ({
        publicId: m.publicId,
        senderType: m.senderType,
        senderName: m.senderName,
        rawText: m.rawText,
        createdAt: m.createdAt,
        metadataJson: m.metadataJson,
      })),
    });
  } catch (err) {
    console.error("[Chat Thread API]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
