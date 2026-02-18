import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineBuildingOffice2,
  HiOutlineDocumentArrowUp,
  HiOutlineUserGroup,
  HiOutlineLightBulb,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { DeveloperMeta, WorkspaceKnowledge } from "@kan/db/schema";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

import CompanyProfileSection from "./components/CompanyProfileSection";
import KnowledgeFilesSection from "./components/KnowledgeFilesSection";
import TeamProfilesSection, {
  getDefaultMeta,
} from "./components/TeamProfilesSection";

const EMPTY_KNOWLEDGE: WorkspaceKnowledge = {
  websiteUrl: "",
  productDescription: "",
  targetAudience: "",
  keyFeatures: "",
  domainTerminology: "",
  additionalContext: "",
  files: [],
};

function computeProgress(knowledge: WorkspaceKnowledge): number {
  let filled = 0;
  const total = 5;

  if (knowledge.productDescription?.trim()) filled++;
  if (knowledge.targetAudience?.trim()) filled++;
  if (knowledge.keyFeatures?.trim()) filled++;
  if (knowledge.domainTerminology?.trim()) filled++;
  if (knowledge.websiteUrl?.trim()) filled++;

  return Math.round((filled / total) * 100);
}

function CollapsibleSection({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-light-200 bg-white transition-all dark:border-dark-300 dark:bg-dark-100">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-light-100 dark:bg-dark-200">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-primary">
              {title}
            </h3>
            <p className="text-xs text-muted">
              {description}
            </p>
          </div>
        </div>
        {isOpen ? (
          <HiChevronUp className="h-5 w-5 flex-shrink-0 text-icon-muted" />
        ) : (
          <HiChevronDown className="h-5 w-5 flex-shrink-0 text-icon-muted" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-light-200 px-5 pb-6 pt-5 dark:border-dark-300">
          {children}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeHub() {
  const { workspace } = useWorkspace();
  const { modalContentType, isOpen } = useModal();
  const { showPopup } = usePopup();
  const { canEditWorkspace } = usePermissions();
  const disabled = !canEditWorkspace;

  const { data: workspaceData, isLoading } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      staleTime: 60_000,
    },
  );

  const utils = api.useUtils();

  const updateWorkspace = api.workspace.update.useMutation({
    onSuccess: async () => {
      await utils.workspace.byId.invalidate({
        workspacePublicId: workspace.publicId,
      });
    },
    onError: () => {
      showPopup({
        header: t`Failed to save`,
        message: t`Could not update knowledge hub. Please try again.`,
        icon: "error",
      });
    },
  });

  const updateMemberMeta = api.member.updateDeveloperMeta.useMutation({
    onSuccess: async () => {
      await utils.workspace.byId.invalidate({
        workspacePublicId: workspace.publicId,
      });
    },
  });

  const serverKnowledge: WorkspaceKnowledge =
    (workspaceData?.knowledgeJson as WorkspaceKnowledge) ?? EMPTY_KNOWLEDGE;
  const members = workspaceData?.members ?? [];

  // --- Local draft state ---
  const [draftKnowledge, setDraftKnowledge] =
    useState<WorkspaceKnowledge>(serverKnowledge);
  const [draftMemberMetas, setDraftMemberMetas] = useState<
    Record<string, DeveloperMeta>
  >({});
  const [saving, setSaving] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (workspaceData && !syncedRef.current) {
      setDraftKnowledge(serverKnowledge);
      syncedRef.current = true;
    }
  }, [workspaceData, serverKnowledge]);

  const handleKnowledgeChange = useCallback(
    (partial: Partial<WorkspaceKnowledge>) => {
      setDraftKnowledge((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  const handleMemberMetaChange = useCallback(
    (publicId: string, meta: DeveloperMeta) => {
      setDraftMemberMetas((prev) => ({ ...prev, [publicId]: meta }));
    },
    [],
  );

  // --- Dirty detection ---
  const isDirty = useMemo(() => {
    const knowledgeDirty =
      JSON.stringify(draftKnowledge) !== JSON.stringify(serverKnowledge);

    const membersDirty = Object.keys(draftMemberMetas).length > 0;

    return knowledgeDirty || membersDirty;
  }, [draftKnowledge, serverKnowledge, draftMemberMetas]);

  // --- Save ---
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateWorkspace.mutateAsync({
        workspacePublicId: workspace.publicId,
        knowledgeJson: draftKnowledge,
      });

      const metaEntries = Object.entries(draftMemberMetas);
      if (metaEntries.length > 0) {
        await Promise.all(
          metaEntries.map(([memberPublicId, meta]) =>
            updateMemberMeta.mutateAsync({
              workspacePublicId: workspace.publicId,
              memberPublicId,
              developerMeta: meta,
            }),
          ),
        );
      }

      setDraftMemberMetas({});
      showPopup({
        header: t`Saved`,
        message: t`Knowledge hub updated successfully.`,
        icon: "success",
      });
    } catch {
      showPopup({
        header: t`Failed to save`,
        message: t`Something went wrong. Please try again.`,
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [
    draftKnowledge,
    draftMemberMetas,
    updateWorkspace,
    updateMemberMeta,
    workspace.publicId,
    showPopup,
  ]);

  const progress = computeProgress(draftKnowledge);

  return (
    <>
      <PageHead title={t`Settings | Knowledge Hub`} />

      <div className="border-t border-light-300 pb-24 dark:border-dark-300">
        {/* Header */}
        <div className="mb-6 mt-8">
          <p className="text-sm text-tertiary">
            {t`Help the AI understand your product and team so it can turn customer feedback into more accurate, actionable work items.`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-tertiary">
              {t`Profile completeness`}
            </span>
            <span
              className={twMerge(
                "text-xs font-semibold",
                progress === 100
                  ? "text-green-500 dark:text-green-400"
                  : "text-light-800 dark:text-dark-800",
              )}
            >
              {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-light-200 dark:bg-dark-300">
            <div
              className={twMerge(
                "h-full rounded-full transition-all duration-500",
                progress === 100
                  ? "bg-green-500"
                  : progress >= 50
                    ? "bg-brand-500"
                    : "bg-brand-400",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Empty state hint */}
        {progress === 0 && !isLoading && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800/30 dark:bg-brand-900/5">
            <HiOutlineLightBulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
            <div>
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                {t`A few minutes here, much better tickets`}
              </p>
              <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                {t`Paste your website URL and we'll try to fill things in for you. Or describe your product manually -- even a couple of fields makes a big difference.`}
              </p>
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          <CollapsibleSection
            title={t`Product & Domain`}
            description={t`What your product does, who uses it, and how they talk about it.`}
            icon={
              <HiOutlineBuildingOffice2 className="h-4 w-4 text-icon-default" />
            }
            defaultOpen={progress === 0}
          >
            <CompanyProfileSection
              knowledge={draftKnowledge}
              onChange={handleKnowledgeChange}
              disabled={disabled}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title={t`Reference Documents`}
            description={t`Upload product specs, style guides, or API docs for extra AI context.`}
            icon={
              <HiOutlineDocumentArrowUp className="h-4 w-4 text-icon-default" />
            }
          >
            <KnowledgeFilesSection
              files={draftKnowledge.files ?? []}
              disabled={disabled}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title={t`Team Profiles`}
            description={t`Developer skills, focus areas, and capacity for each team member.`}
            icon={
              <HiOutlineUserGroup className="h-4 w-4 text-icon-default" />
            }
          >
            <TeamProfilesSection
              members={members}
              memberMetas={draftMemberMetas}
              onMemberMetaChange={handleMemberMetaChange}
              disabled={disabled}
            />
          </CollapsibleSection>
        </div>
      </div>

      {/* Sticky save bar */}
      {!disabled && isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-light-200 bg-white/95 backdrop-blur-sm dark:border-dark-400 dark:bg-dark-100/95">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
            <p className="text-sm text-tertiary">
              {t`You have unsaved changes`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftKnowledge(serverKnowledge);
                  setDraftMemberMetas({});
                }}
                disabled={saving}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-tertiary transition-colors hover:bg-light-100 dark:hover:bg-dark-300"
              >
                {t`Discard`}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={twMerge(
                  "rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600",
                  saving && "opacity-60",
                )}
              >
                {saving ? t`Saving...` : t`Save changes`}
              </button>
            </div>
          </div>
        </div>
      )}

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
