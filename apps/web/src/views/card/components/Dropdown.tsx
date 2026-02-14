import { t } from "@lingui/core/macro";
import { useState } from "react";
import {
  HiEllipsisHorizontal,
  HiLink,
  HiOutlineBolt,
  HiOutlineCheckCircle,
  HiOutlineTrash,
} from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import Dropdown from "~/components/Dropdown";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function CardDropdown({
  cardPublicId,
  cardTitle,
  isTemplate,
  boardPublicId,
  cardCreatedBy,
}: {
  cardPublicId: string;
  cardTitle?: string;
  isTemplate?: boolean;
  boardPublicId?: string;
  cardCreatedBy?: string | null;
}) {
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const { canEditCard, canDeleteCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const isCreator = cardCreatedBy && session?.user.id === cardCreatedBy;
  const utils = api.useUtils();

  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const createFromCard = api.workItem.createFromCard.useMutation({
    onSuccess: () => {
      showPopup({
        header: t`Work item created`,
        message: t`The card has been converted to a work item.`,
        icon: "success",
      });
      void utils.workItem.list.invalidate();
    },
    onError: () => {
      showPopup({
        header: t`Unable to create work item`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const handleCopyCardLink = async () => {
    const path =
      isTemplate && boardPublicId
        ? `/templates/${boardPublicId}/cards/${cardPublicId}`
        : `/cards/${cardPublicId}`;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      showPopup({
        header: t`Link copied`,
        icon: "success",
        message: t`Card URL copied to clipboard`,
      });
    } catch (error) {
      console.error(error);
      showPopup({
        header: t`Unable to copy link`,
        icon: "error",
        message: t`Please try again.`,
      });
    }
  };

  const handleConvertToWorkItem = (type: "Feature" | "Bug" | "Chore" | "Docs") => {
    createFromCard.mutate({
      workspacePublicId: workspace.publicId,
      cardTitle: cardTitle ?? "Untitled",
      type,
      priority: "P2",
    });
    setShowTypeMenu(false);
  };

  const items = [
    {
      label: t`Copy card link`,
      action: handleCopyCardLink,
      icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
    },
    ...(canEditCard
      ? [
          {
            label: t`Add checklist`,
            action: () => openModal("ADD_CHECKLIST"),
            icon: (
              <HiOutlineCheckCircle className="h-[16px] w-[16px] text-dark-900" />
            ),
          },
        ]
      : []),
    ...(canEditCard && !isTemplate
      ? [
          {
            label: t`Convert to Work Item`,
            action: () => setShowTypeMenu(true),
            icon: (
              <HiOutlineBolt className="h-[16px] w-[16px] text-dark-900" />
            ),
          },
        ]
      : []),
    ...(canDeleteCard || isCreator
      ? [
          {
            label: t`Delete card`,
            action: () => openModal("DELETE_CARD"),
            icon: (
              <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />
            ),
          },
        ]
      : []),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Dropdown items={items}>
        <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
      </Dropdown>

      {/* Work Item type picker modal */}
      {showTypeMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/50">
          <div className="w-64 rounded-lg border border-light-300 bg-white p-4 shadow-xl dark:border-dark-400 dark:bg-dark-100">
            <p className="mb-3 text-sm font-semibold text-light-900 dark:text-dark-900">
              {t`Select work item type`}
            </p>
            <div className="space-y-1">
              {(["Feature", "Bug", "Chore", "Docs"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleConvertToWorkItem(type)}
                  disabled={createFromCard.isPending}
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-neutral-900 hover:bg-light-200 disabled:opacity-50 dark:text-dark-950 dark:hover:bg-dark-300"
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTypeMenu(false)}
              className="mt-3 w-full rounded-md px-3 py-1.5 text-xs font-medium text-light-800 hover:bg-light-200 dark:text-dark-800 dark:hover:bg-dark-300"
            >
              {t`Cancel`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
