import { render } from "@react-email/render";
import nodemailer from "nodemailer";

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

function resolveEnvBool(value: string | undefined, fallback: boolean): boolean {
  if (!value || value.trim() === "" || value.trim().startsWith("#")) {
    return fallback;
  }
  return value.trim().toLowerCase() === "true";
}

const smtpPort = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  // Default secure based on port: 465 → true (implicit TLS), 587 → false (STARTTLS)
  secure: resolveEnvBool(process.env.SMTP_SECURE, smtpPort === 465),
  tls: {
    rejectUnauthorized: resolveEnvBool(
      process.env.SMTP_REJECT_UNAUTHORIZED,
      true,
    ),
  },
  ...(process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD && {
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    }),
  // Increase connection timeout for slower providers
  connectionTimeout: 30000,
  greetingTimeout: 30000,
});

export const sendEmail = async (
  to: string,
  subject: string,
  template: Templates,
  data: Record<string, string>,
) => {
  try {
    const EmailTemplate = emailTemplates[template];

    const html = await render(<EmailTemplate {...data} />, { pretty: true });

    const options = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    const response = await transporter.sendMail(options);

    if (!response.accepted.length) {
      throw new Error(`Failed to send email: ${response.response}`);
    }

    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Provide actionable guidance for common SMTP errors
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
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    throw error;
  }
};
