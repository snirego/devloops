import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as feedbackRepo from "@kan/db/repository/feedback.repo";
import { sendRawEmail } from "@kan/email";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const FEEDBACK_EMAIL_TO = "snirego0456@gmail.com";

export const feedbackRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      enabled: false,
      openapi: { enabled: false, method: "POST", path: "/feedback" },
    })
    .input(
      z.object({
        feedback: z.string().min(1),
        url: z.string().min(1),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const result = await feedbackRepo.create(ctx.db, {
        feedback: input.feedback,
        createdBy: userId,
        url: input.url,
      });

      if (!result?.id)
        throw new TRPCError({
          message: `Unable to create feedback`,
          code: "INTERNAL_SERVER_ERROR",
        });

      const escape = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const userName = escape(ctx.user?.name ?? "Unknown");
      const userEmail = escape(ctx.user?.email ?? "");
      const escapedFeedback = input.feedback
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      const escapedUrl = input.url
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const html = `
        <p><strong>From:</strong> ${userName}${userEmail ? ` &lt;${userEmail}&gt;` : ""}</p>
        <p><strong>Page:</strong> <a href="${escapedUrl}">${escapedUrl}</a></p>
        <hr>
        <p>${escapedFeedback}</p>
      `;

      try {
        await sendRawEmail(
          FEEDBACK_EMAIL_TO,
          `[Devloops Feedback] ${userName}`,
          html,
        );
      } catch (err) {
        console.error("[feedback.create] Email send failed:", err);
        // Do not fail the mutation; feedback is already stored
      }

      return { success: true };
    }),
});
