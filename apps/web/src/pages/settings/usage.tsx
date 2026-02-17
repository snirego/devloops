import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import UsageSettings from "~/views/settings/UsageSettings";
import Popup from "~/components/Popup";

const UsageSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="usage">
      <UsageSettings />
      <Popup />
    </SettingsLayout>
  );
};

UsageSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default UsageSettingsPage;
