import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import { HiBolt, HiOutlineClipboard } from "react-icons/hi2";

import type { Subscription } from "@kan/shared/utils";
import { hasActiveSubscription } from "@kan/shared/utils";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import UpdateBrandColorForm from "./components/UpdateBrandColorForm";
import UpdateWorkspaceDescriptionForm from "./components/UpdateWorkspaceDescriptionForm";
import UpdateWorkspaceEmailVisibilityForm from "./components/UpdateWorkspaceEmailVisibilityForm";
import UpdateWorkspaceNameForm from "./components/UpdateWorkspaceNameForm";
import UpdateWorkspaceUrlForm from "./components/UpdateWorkspaceUrlForm";
import { UpgradeToProConfirmation } from "./components/UpgradeToProConfirmation";

export default function WorkspaceSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const { canEditWorkspace } = usePermissions();
  const router = useRouter();
  const { data } = api.user.getUser.useQuery(undefined, {
    staleTime: 2 * 60_000,
  });
  const [hasOpenedUpgradeModal, setHasOpenedUpgradeModal] = useState(false);
  const [copiedWorkspaceId, setCopiedWorkspaceId] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const copyWorkspaceId = () => {
    if (!workspace.publicId) return;
    void navigator.clipboard.writeText(workspace.publicId);
    setCopiedWorkspaceId(true);
    setTimeout(() => setCopiedWorkspaceId(false), 2000);
  };

  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      staleTime: 2 * 60_000,
    },
  );

  const subscriptions = workspaceData?.subscriptions as
    | Subscription[]
    | undefined;

  // Open upgrade modal if upgrade=pro is in URL params
  useEffect(() => {
    if (
      router.query.upgrade === "pro" &&
      env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
      !hasActiveSubscription(subscriptions, "pro") &&
      !hasOpenedUpgradeModal
    ) {
      openModal("UPGRADE_TO_PRO");
      setHasOpenedUpgradeModal(true);
    }
  }, [router.query.upgrade, subscriptions, openModal, hasOpenedUpgradeModal]);

  return (
    <>
      <PageHead title={t`Settings | Workspace`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        {mounted && workspace.publicId && (
          <>
            <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
              {t`Workspace ID`}
            </h2>
            <p className="mb-2 text-xs text-light-700 dark:text-dark-700">
              {t`Use this ID for the chat widget and for NEXT_PUBLIC_DEVLOOPS_FEEDBACK_WORKSPACE_ID when routing in-app feedback to this workspace.`}
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-light-200 px-2 py-1.5 text-sm dark:bg-dark-300">
                {workspace.publicId}
              </code>
              <button
                type="button"
                onClick={copyWorkspaceId}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-light-700 transition-colors hover:bg-light-200 hover:text-light-900 dark:text-dark-700 dark:hover:bg-dark-300 dark:hover:text-dark-900"
              >
                <HiOutlineClipboard className="h-3.5 w-3.5" />
                {copiedWorkspaceId ? t`Copied!` : t`Copy`}
              </button>
            </div>
          </>
        )}

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace name`}
        </h2>
        <UpdateWorkspaceNameForm
          workspacePublicId={workspace.publicId}
          workspaceName={workspace.name}
          disabled={!canEditWorkspace}
        />

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace URL`}
        </h2>
        <UpdateWorkspaceUrlForm
          workspacePublicId={workspace.publicId}
          workspaceUrl={workspace.slug ?? ""}
          workspacePlan={workspace.plan ?? "free"}
          disabled={!canEditWorkspace}
        />

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace description`}
        </h2>
        <UpdateWorkspaceDescriptionForm
          workspacePublicId={workspace.publicId}
          workspaceDescription={workspace.description ?? ""}
          disabled={!canEditWorkspace}
        />

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Email visibility`}
        </h2>
        <UpdateWorkspaceEmailVisibilityForm
          workspacePublicId={workspace.publicId}
          showEmailsToMembers={Boolean(
            workspaceData?.showEmailsToMembers ?? false,
          )}
          disabled={!canEditWorkspace}
        />

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Brand color`}
        </h2>
        <UpdateBrandColorForm
          workspacePublicId={workspace.publicId}
          currentBrandColor={workspaceData?.brandColor}
          disabled={!canEditWorkspace}
        />

        {env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
          !hasActiveSubscription(subscriptions, "pro") &&
          !hasActiveSubscription(subscriptions, "team") && (
            <div className="my-8">
              <Button
                onClick={() => openModal("UPGRADE_TO_PRO")}
                iconRight={<HiBolt />}
              >
                {t`Upgrade to Pro`}
              </Button>
            </div>
          )}

        <div className="border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Delete workspace`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Once you delete your workspace, there is no going back. This action cannot be undone.`}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => openModal("DELETE_WORKSPACE")}
              disabled={workspace.role !== "admin" && workspace.role !== "super-admin"}
            >
              {t`Delete workspace`}
            </Button>
          </div>
        </div>
      </div>

      {/* Workspace-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_WORKSPACE"}
      >
        <DeleteWorkspaceConfirmation />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "UPGRADE_TO_PRO"}
      >
        <UpgradeToProConfirmation
          userId={data?.id ?? ""}
          workspacePublicId={workspace.publicId}
        />
      </Modal>

      {/* Global modals */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
      >
        <FeedbackModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}
