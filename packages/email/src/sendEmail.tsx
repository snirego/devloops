import { render } from "@react-email/render";
import { Resend } from "resend";

import JoinWorkspaceTemplate from "./templates/join-workspace";
import MagicLinkTemplate from "./templates/magic-link";
import MentionTemplate from "./templates/mention";
import ResetPasswordTemplate from "./templates/reset-password";

type Templates = "MAGIC_LINK" | "JOIN_WORKSPACE" | "RESET_PASSWORD" | "MENTION";

const emailTemplates: Record<Templates, React.ComponentType<any>> = {
  MAGIC_LINK: MagicLinkTemplate,
  JOIN_WORKSPACE: JoinWorkspaceTemplate,
  RESET_PASSWORD: ResetPasswordTemplate,
  MENTION: MentionTemplate,
};

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (
  to: string,
  subject: string,
  template: Templates,
  data: Record<string, string>,
) => {
  try {
    const EmailTemplate = emailTemplates[template];

    const html = await render(<EmailTemplate {...data} />, { pretty: true });

    const { data: response, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Devloops <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Provide actionable guidance for common Resend errors
    if (errMsg.includes("domain is not verified")) {
      console.error(
        `Email sending failed: The sender domain in EMAIL_FROM (${process.env.EMAIL_FROM}) is not verified with your email provider. ` +
        `Please verify your domain at https://resend.com/domains or use "onboarding@resend.dev" for testing.`,
      );
    } else if (errMsg.includes("only send testing emails")) {
      console.error(
        `Email sending failed: Resend testing mode only allows sending to your own email. ` +
        `To send to other recipients, verify a domain at https://resend.com/domains.`,
      );
    } else {
      console.error("Email sending failed:", {
        to,
        from: process.env.EMAIL_FROM,
        subject,
        template,
        error: errMsg,
      });
    }
    throw error;
  }
};
