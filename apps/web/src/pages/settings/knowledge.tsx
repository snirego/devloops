import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import KnowledgeHub from "~/views/settings/KnowledgeHub";
import Popup from "~/components/Popup";

const KnowledgeHubPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="knowledge">
      <KnowledgeHub />
      <Popup />
    </SettingsLayout>
  );
};

KnowledgeHubPage.getLayout = (page) => getDashboardLayout(page);

export default KnowledgeHubPage;
