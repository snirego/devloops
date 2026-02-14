import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import ChatView from "~/views/chat";

const ChatPage: NextPageWithLayout = () => {
  return (
    <>
      <ChatView />
      <Popup />
    </>
  );
};

ChatPage.getLayout = (page) => getDashboardLayout(page);

export default ChatPage;
