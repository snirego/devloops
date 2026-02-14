import PublicChatView from "~/views/public-chat";

/**
 * Public shareable chat page — no dashboard layout, no auth required.
 * URL: /chat/:threadPublicId
 */
export default function PublicChatPage() {
  return <PublicChatView />;
}
