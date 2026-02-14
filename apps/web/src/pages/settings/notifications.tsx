import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import NotificationSettings from "~/views/settings/NotificationSettings";

const NotificationSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="notifications">
      <NotificationSettings />
    </SettingsLayout>
  );
};

NotificationSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default NotificationSettingsPage;
