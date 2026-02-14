import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import WorkItemsView from "~/views/work-items";

const WorkItemsPage: NextPageWithLayout = () => {
  return (
    <>
      <WorkItemsView />
      <Popup />
    </>
  );
};

WorkItemsPage.getLayout = (page) => getDashboardLayout(page);

export default WorkItemsPage;
