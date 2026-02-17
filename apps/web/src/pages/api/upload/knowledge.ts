import type { NextApiRequest, NextApiResponse } from "next";
import { Upload } from "@aws-sdk/lib-storage";

import { createNextApiContext } from "@kan/api/trpc";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import type { WorkspaceKnowledge, KnowledgeFile } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

import { env } from "~/env";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import { createS3Client } from "@kan/shared/utils";
import { assertPermission } from "@kan/api/utils/permissions";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
]);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withRateLimit(
  { points: 30, duration: 60 },
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { user, db } = await createNextApiContext(req);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const bucket = env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME;
      if (!bucket) {
        return res.status(500).json({ error: "Storage not configured" });
      }

      const workspacePublicId = req.query.workspacePublicId;
      if (
        typeof workspacePublicId !== "string" ||
        workspacePublicId.length < 12
      ) {
        return res.status(400).json({ error: "Invalid workspacePublicId" });
      }

      const contentType = req.headers["content-type"];
      const contentLengthHeader = req.headers["content-length"];
      const contentLength = contentLengthHeader
        ? Number.parseInt(contentLengthHeader, 10)
        : NaN;

      if (typeof contentType !== "string") {
        return res.status(400).json({ error: "Missing content type" });
      }

      if (!ALLOWED_TYPES.has(contentType)) {
        return res.status(400).json({
          error:
            "Unsupported file type. Allowed: PDF, Word, Excel, TXT, Markdown, CSV, JSON.",
        });
      }

      if (!Number.isFinite(contentLength) || contentLength <= 0) {
        return res
          .status(400)
          .json({ error: "Missing or invalid content length" });
      }

      if (contentLength > MAX_SIZE_BYTES) {
        return res
          .status(400)
          .json({ error: "File too large. Maximum size is 20MB." });
      }

      const originalFilename =
        (req.headers["x-original-filename"] as string | undefined) ?? "file";

      const sanitizedFilename = originalFilename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 200);

      const workspace = await workspaceRepo.getByPublicId(
        db,
        workspacePublicId,
      );

      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      try {
        await assertPermission(
          db,
          user.id,
          workspace.id,
          "workspace:edit",
        );
      } catch {
        return res.status(403).json({ error: "Permission denied" });
      }

      const fileId = generateUID();
      const s3Key = `${workspacePublicId}/knowledge/${fileId}-${sanitizedFilename}`;

      const client = createS3Client();

      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: s3Key,
          Body: req,
          ContentType: contentType,
          ContentLength: contentLength,
        },
        leavePartsOnError: false,
      });

      await upload.done();

      const newFile: KnowledgeFile = {
        id: fileId,
        filename: sanitizedFilename,
        originalFilename,
        contentType,
        size: contentLength,
        s3Key,
        uploadedAt: new Date().toISOString(),
      };

      const existingKnowledge =
        ((
          await workspaceRepo.getByPublicIdWithKnowledge(
            db,
            workspacePublicId,
          )
        )?.knowledgeJson as WorkspaceKnowledge | null) ?? null;

      const currentFiles: KnowledgeFile[] = existingKnowledge?.files ?? [];

      const updatedKnowledge: WorkspaceKnowledge = {
        websiteUrl: existingKnowledge?.websiteUrl ?? "",
        productDescription: existingKnowledge?.productDescription ?? "",
        targetAudience: existingKnowledge?.targetAudience ?? "",
        keyFeatures: existingKnowledge?.keyFeatures ?? "",
        domainTerminology: existingKnowledge?.domainTerminology ?? "",
        additionalContext: existingKnowledge?.additionalContext ?? "",
        files: [...currentFiles, newFile],
      };

      await workspaceRepo.update(db, workspacePublicId, {
        knowledgeJson: updatedKnowledge,
      });

      return res.status(200).json({ file: newFile });
    } catch (error) {
      console.error("Knowledge file upload failed", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);
