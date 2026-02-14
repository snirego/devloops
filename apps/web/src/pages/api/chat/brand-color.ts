import type { NextApiRequest, NextApiResponse } from "next";

import { createDrizzleClient } from "@kan/db/client";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * GET /api/chat/brand-color?workspaceId=<publicId>
 *
 * Returns the workspace brand color for widget theming.
 * Public endpoint — no auth required (only returns brand color).
 */
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
    const workspaceId = req.query.workspaceId as string;

    if (!workspaceId) {
      return res.status(200).json({ brandColor: "#6366f1" });
    }

    const db = createDrizzleClient();
    const workspace = await workspaceRepo.getByPublicId(db, workspaceId);

    return res.status(200).json({
      brandColor: workspace?.brandColor ?? "#6366f1",
    });
  } catch (err) {
    console.error("[Brand Color API]", err);
    return res.status(200).json({ brandColor: "#6366f1" });
  }
}
