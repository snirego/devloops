import { t } from "@lingui/core/macro";
import { useRef, useState } from "react";
import {
  HiOutlineArrowsRightLeft,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUserPlus,
} from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import ContextMenu from "~/components/ContextMenu";
import type { ContextMenuEntry } from "~/components/ContextMenu";
import { usePermissions } from "~/hooks/usePermissions";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";

// ── Types ────────────────────────────────────────────────────────────

interface BoardQueryParams {
  boardPublicId: string;
  members?: string[];
  labels?: string[];
  lists?: string[];
  dueDateFilters?: (
    | "overdue"
    | "today"
    | "tomorrow"
    | "next-week"
    | "next-month"
    | "no-due-date"
  )[];
  type?: "regular" | "template";
}

interface CardContextMenuProps {
  x: number;
  y: number;
  cardPublicId: string;
  cardTitle: string;
  boardQueryParams: BoardQueryParams;
  currentListPublicId: string;
  lists: { publicId: string; name: string }[];
  workspaceMembers: {
    publicId: string;
    email: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  }[];
  selectedMemberPublicIds: string[];
  isTemplate?: boolean;
  cardCreatedBy?: string | null;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export function CardContextMenu({
  x,
  y,
  cardPublicId,
  cardTitle,
  boardQueryParams,
  currentListPublicId,
  lists,
  workspaceMembers,
  selectedMemberPublicIds,
  isTemplate,
  cardCreatedBy,
  onClose,
}: CardContextMenuProps) {
  const { canEditCard, canDeleteCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const isCreator = cardCreatedBy && session?.user?.id === cardCreatedBy;
  const canEdit = canEditCard || !!isCreator;
  const canDelete = canDeleteCard || !!isCreator;

  // ── Rename state (passed into customContent slot) ──
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(cardTitle);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── Local optimistic state for member multi-select ──
  const [localMembers, setLocalMembers] = useState<string[]>(
    selectedMemberPublicIds,
  );

  // ── Mutations ──

  const updateCard = api.card.update.useMutation({
    onMutate: (args) => {
      void utils.board.byId.cancel();
      const prev = utils.board.byId.getData(boardQueryParams);
      utils.board.byId.setData(boardQueryParams, (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.map((c) =>
              c.publicId === cardPublicId
                ? {
                    ...c,
                    ...(args.title !== undefined && { title: args.title }),
                    ...(args.listPublicId !== undefined && {
                      listPublicId: args.listPublicId,
                    }),
                  }
                : c,
            ),
          })),
        };
      });
      return { prev };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.prev)
        utils.board.byId.setData(boardQueryParams, ctx.prev);
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: () => {
      void utils.board.byId.invalidate();
      void utils.card.byId.invalidate({ cardPublicId });
    },
  });

  const deleteCard = api.card.delete.useMutation({
    onMutate: () => {
      void utils.board.byId.cancel();
      const prev = utils.board.byId.getData(boardQueryParams);
      utils.board.byId.setData(boardQueryParams, (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.filter((c) => c.publicId !== cardPublicId),
          })),
        };
      });
      return { prev };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.prev)
        utils.board.byId.setData(boardQueryParams, ctx.prev);
      showPopup({
        header: t`Unable to delete card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: () => {
      void utils.board.byId.invalidate();
    },
  });

  const addOrRemoveMember = api.card.addOrRemoveMember.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update members`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: () => {
      void utils.board.byId.invalidate();
      void utils.card.byId.invalidate({ cardPublicId });
    },
  });

  // ── Handlers ──

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== cardTitle) {
      updateCard.mutate({ cardPublicId, title: trimmed });
    }
    onClose();
  };

  // ── Build items ──

  const items: ContextMenuEntry[] = [];

  // When renaming, show the custom rename UI instead of the normal menu
  if (isRenaming) {
    items.push({
      customContent: true,
      children: ({ onClose: close }: { onClose: () => void }) => (
        <div className="w-56 p-2">
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") close();
            }}
            autoFocus
            className="w-full rounded-md border border-light-300 bg-light-50 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              onClick={close}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-300"
            >
              {t`Cancel`}
            </button>
            <button
              onClick={submitRename}
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              {t`Save`}
            </button>
          </div>
        </div>
      ),
    });
  } else {
    // Rename
    if (canEdit) {
      items.push({
        label: t`Rename`,
        icon: <HiOutlinePencil className="h-3.5 w-3.5" />,
        onClick: () => setIsRenaming(true),
        keepOpen: true,
      });
    }

    // Move to list (sub-menu)
    if (canEdit) {
      items.push({
        label: t`Move to list`,
        icon: <HiOutlineArrowsRightLeft className="h-3.5 w-3.5" />,
        subMenu: true,
        children: ({ onBack }: { onBack: () => void }) => (
          <>
            <button
              onClick={onBack}
              className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm font-semibold text-neutral-700 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-400"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              {t`Move to list`}
            </button>
            <div className="my-0.5 border-t border-light-200 dark:border-dark-500" />
            {lists.map((list) => (
              <button
                key={list.publicId}
                onClick={() => {
                  if (list.publicId !== currentListPublicId) {
                    updateCard.mutate({
                      cardPublicId,
                      listPublicId: list.publicId,
                      index: 0,
                    });
                  }
                  onClose();
                }}
                className={`flex w-full items-center rounded-[5px] px-2.5 py-1.5 text-left text-sm ${
                  list.publicId === currentListPublicId
                    ? "font-semibold text-indigo-600 dark:text-indigo-400"
                    : "text-neutral-900 dark:text-dark-950"
                } hover:bg-light-200 dark:hover:bg-dark-400`}
              >
                <span className="flex-1">{list.name}</span>
                {list.publicId === currentListPublicId && (
                  <span className="text-[10px] text-light-600 dark:text-dark-700">
                    {t`current`}
                  </span>
                )}
              </button>
            ))}
          </>
        ),
      });
    }

    // Members (sub-menu)
    if (canEdit && !isTemplate) {
      items.push({
        label: t`Members`,
        icon: <HiOutlineUserPlus className="h-3.5 w-3.5" />,
        subMenu: true,
        children: ({ onBack }: { onBack: () => void }) => (
          <>
            <button
              onClick={onBack}
              className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm font-semibold text-neutral-700 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-400"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              {t`Members`}
            </button>
            <div className="my-0.5 border-t border-light-200 dark:border-dark-500" />
            {workspaceMembers.map((member) => {
              const isSelected = localMembers.includes(member.publicId);
              const displayName = formatMemberDisplayName(
                member.user?.name ?? null,
                member.user?.email ?? member.email,
              );
              const avatarUrl = member.user?.image
                ? getAvatarUrl(member.user.image)
                : undefined;

              return (
                <button
                  key={member.publicId}
                  onClick={() => {
                    // Optimistic toggle
                    setLocalMembers((prev) =>
                      prev.includes(member.publicId)
                        ? prev.filter((id) => id !== member.publicId)
                        : [...prev, member.publicId],
                    );
                    addOrRemoveMember.mutate({
                      cardPublicId,
                      workspaceMemberPublicId: member.publicId,
                    });
                  }}
                  className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm text-neutral-900 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-400"
                >
                  <span
                    className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-light-400 dark:border-dark-500"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="h-2.5 w-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </span>
                  <Avatar
                    size="xs"
                    name={member.user?.name ?? ""}
                    imageUrl={avatarUrl}
                    email={member.user?.email ?? member.email}
                  />
                  <span className="flex-1 truncate">{displayName}</span>
                </button>
              );
            })}
          </>
        ),
      });
    }

    // Separator before delete
    if ((canEdit || canDelete) && canDelete) {
      items.push({ separator: true });
    }

    // Delete
    if (canDelete) {
      items.push({
        label: t`Delete`,
        icon: <HiOutlineTrash className="h-3.5 w-3.5" />,
        variant: "danger",
        onClick: () => {
          deleteCard.mutate({ cardPublicId });
        },
      });
    }
  }

  return (
    <ContextMenu x={x} y={y} items={items} onClose={onClose} minWidth="170px" />
  );
}
