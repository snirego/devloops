import Link from "next/link";
import { t } from "@lingui/core/macro";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { HiXMark } from "react-icons/hi2";
import { IoChevronForwardSharp } from "react-icons/io5";

import { authClient } from "@kan/auth/client";

import type { WorkspaceMember } from "~/components/Editor";
import Avatar from "~/components/Avatar";
import { DeleteLabelConfirmation } from "~/components/DeleteLabelConfirmation";
import Editor from "~/components/Editor";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import ActivityList from "~/views/card/components/ActivityList";
import { AttachmentThumbnails } from "~/views/card/components/AttachmentThumbnails";
import { AttachmentUpload } from "~/views/card/components/AttachmentUpload";
import Checklists from "~/views/card/components/Checklists";
import { DeleteCardConfirmation } from "~/views/card/components/DeleteCardConfirmation";
import { DeleteChecklistConfirmation } from "~/views/card/components/DeleteChecklistConfirmation";
import { DeleteCommentConfirmation } from "~/views/card/components/DeleteCommentConfirmation";
import CardDropdown from "~/views/card/components/Dropdown";
import { DueDateSelector } from "~/views/card/components/DueDateSelector";
import LabelSelector from "~/views/card/components/LabelSelector";
import ListSelector from "~/views/card/components/ListSelector";
import MemberSelector from "~/views/card/components/MemberSelector";
import { NewChecklistForm } from "~/views/card/components/NewChecklistForm";
import NewCommentForm from "~/views/card/components/NewCommentForm";

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

interface CardModalProps {
  cardPublicId: string;
  boardPublicId: string;
  isTemplate?: boolean;
  onClose: () => void;
}

export function CardModal({
  cardPublicId,
  boardPublicId,
  isTemplate,
  onClose,
}: CardModalProps) {
  const utils = api.useUtils();
  const { workspace } = useWorkspace();
  const {
    modalContentType,
    entityId,
    isOpen,
    modalStates,
    getModalState,
    clearModalState,
  } = useModal();
  const { showPopup } = usePopup();
  const { canEditCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Server query (read-only feed) ──
  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const isCreator = card?.createdBy && session?.user.id === card.createdBy;
  const canEdit = canEditCard || !!isCreator;
  const board = card?.list.board;
  const workspaceMembers = board?.workspace.members;

  // ── Local-first state for title & description ──
  // Seeded once from server data; after that the user's keystrokes are the
  // single source of truth.  Server re-fetches will NOT clobber them.
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localDesc, setLocalDesc] = useState<string | null>(null);
  // Track what was last sent to server so we can diff
  const lastSavedTitle = useRef<string>("");
  const lastSavedDesc = useRef<string>("");

  // Seed once when card data first arrives
  useEffect(() => {
    if (card && localTitle === null) {
      setLocalTitle(card.title);
      lastSavedTitle.current = card.title;
    }
    if (card && localDesc === null) {
      setLocalDesc(card.description ?? "");
      lastSavedDesc.current = card.description ?? "";
    }
  }, [card, localTitle, localDesc]);

  const title = localTitle ?? card?.title ?? "";
  const description = localDesc ?? card?.description ?? "";

  // ── Mutation ──
  const updateCard = api.card.update.useMutation({
    onMutate: (args) => {
      // Snapshot for rollback
      const prevCard = utils.card.byId.getData({ cardPublicId });

      // Optimistic update for card.byId
      const patch: Record<string, unknown> = {};
      if (args.title !== undefined) patch.title = args.title;
      if (args.description !== undefined) patch.description = args.description;

      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old;
        return { ...old, ...patch };
      });

      return { prevCard };
    },
    onError: (_err, _args, context) => {
      if (context?.prevCard)
        utils.card.byId.setData({ cardPublicId }, context.prevCard);
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: () => {
      // Background reconciliation — never block the UI
      void utils.card.byId.invalidate({ cardPublicId });
      void utils.card.getActivities.invalidate({ cardPublicId });
      void utils.board.byId.invalidate();
    },
  });

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to add label`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: () => {
      void utils.card.byId.invalidate({ cardPublicId });
      void utils.board.byId.invalidate();
    },
  });

  // ── Save helpers ──
  // Single function that sends dirty fields in ONE mutation call
  const savePendingChanges = useCallback(() => {
    const dirtyTitle = (localTitle ?? "") !== lastSavedTitle.current;
    const dirtyDesc = (localDesc ?? "") !== lastSavedDesc.current;

    if (!dirtyTitle && !dirtyDesc) return;

    const payload: {
      cardPublicId: string;
      title?: string;
      description?: string;
    } = { cardPublicId };

    if (dirtyTitle) {
      const t = localTitle ?? "";
      // Server requires min(1) for title — don't send empty
      if (t.length > 0) {
        payload.title = t;
        lastSavedTitle.current = t;
      }
    }
    if (dirtyDesc) {
      payload.description = localDesc ?? "";
      lastSavedDesc.current = payload.description;
    }

    // Only fire if there's something to send besides cardPublicId
    if (payload.title !== undefined || payload.description !== undefined) {
      updateCard.mutate(payload);
    }
  }, [localTitle, localDesc, updateCard, cardPublicId]);

  const saveTitle = useCallback(() => {
    const current = localTitle ?? "";
    if (current === lastSavedTitle.current) return;
    if (current.length === 0) return; // Server requires min(1)
    lastSavedTitle.current = current;
    updateCard.mutate({ cardPublicId, title: current });
  }, [localTitle, updateCard, cardPublicId]);

  // Debounce description saves
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleDescriptionChange = useCallback(
    (value: string) => {
      setLocalDesc(value);
      // Debounce the actual network call
      clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => {
        if (value === lastSavedDesc.current) return;
        lastSavedDesc.current = value;
        updateCard.mutate({ cardPublicId, description: value });
      }, 800);
    },
    [updateCard, cardPublicId],
  );

  // Flush any pending debounced save immediately
  const flushDescription = useCallback(() => {
    clearTimeout(descTimerRef.current);
    const current = localDesc ?? "";
    if (current !== lastSavedDesc.current) {
      lastSavedDesc.current = current;
      updateCard.mutate({ cardPublicId, description: current });
    }
  }, [localDesc, updateCard, cardPublicId]);

  // ── Editor workspace members ──
  const editorWorkspaceMembers: WorkspaceMember[] =
    workspaceMembers
      ?.filter((member) => member.email)
      .map((member) => ({
        publicId: member.publicId,
        email: member.email,
        user: member.user
          ? {
              id: member.user.id,
              name: member.user.name ?? null,
              image: member.user.image ?? null,
            }
          : null,
      })) ?? [];

  const refetchCard = async () => {
    await utils.card.byId.refetch({ cardPublicId });
  };

  // ── Effects ──
  // Auto-label after creating a new label
  useEffect(() => {
    const newLabelId = modalStates.NEW_LABEL_CREATED;
    if (newLabelId && cardPublicId) {
      const isAlreadyAdded = card?.labels.some(
        (label) => label.publicId === newLabelId,
      );
      if (!isAlreadyAdded) {
        addOrRemoveLabel.mutate({ cardPublicId, labelPublicId: newLabelId });
      }
      clearModalState("NEW_LABEL_CREATED");
    }
  }, [modalStates.NEW_LABEL_CREATED, card, cardPublicId]);

  // Open new item form after creating a new checklist
  useEffect(() => {
    if (!card) return;
    const state = getModalState("ADD_CHECKLIST");
    const createdId: string | undefined = state?.createdChecklistId;
    if (createdId) {
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, getModalState, clearModalState]);

  // Cleanup debounce timer
  useEffect(() => () => clearTimeout(descTimerRef.current), []);

  // ── Close ──
  const handleClose = useCallback(() => {
    // Flush all pending changes in a SINGLE mutation
    clearTimeout(descTimerRef.current);
    savePendingChanges();
    onClose();
  }, [onClose, savePendingChanges]);

  // ESC key handler — only close when no sub-modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isOpen) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const handleDialogClose = useCallback(() => {
    if (!isOpen) handleClose();
  }, [isOpen, handleClose]);

  // ── Right panel data ──
  const labels = board?.labels;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  const formattedLabels =
    labels?.map((label) => ({
      key: label.publicId,
      value: label.name,
      selected:
        selectedLabels?.some((sl) => sl.publicId === label.publicId) ?? false,
      leftIcon: <LabelIcon colourCode={label.colourCode} />,
    })) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => ({
      key: member.publicId,
      value: formatMemberDisplayName(
        member.user?.name ?? null,
        member.user?.email ?? member.email,
      ),
      selected:
        selectedMembers?.some((sm) => sm.publicId === member.publicId) ?? false,
      leftIcon: (
        <Avatar
          size="xs"
          name={member.user?.name ?? ""}
          imageUrl={
            member.user?.image ? getAvatarUrl(member.user.image) : undefined
          }
          email={member.user?.email ?? member.email}
        />
      ),
    })) ?? [];

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────
  return (
    <>
      <Transition.Root show={true} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleDialogClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 transition-opacity dark:bg-black/60" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 overflow-hidden">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-4"
            >
              <Dialog.Panel className="mx-auto mt-[3vh] flex h-[94vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-xl border border-light-400 bg-light-50 shadow-2xl dark:border-dark-400 dark:bg-dark-50">
                {/* Top bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-light-300 px-6 py-2.5 dark:border-dark-300">
                  {!card && isLoading && (
                    <div className="flex space-x-2">
                      <div className="h-[1.5rem] w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                    </div>
                  )}
                  {card && (
                    <>
                      <div className="flex items-center gap-1 text-sm">
                        <Link
                          className="whitespace-nowrap font-bold text-light-900 dark:text-dark-950"
                          href={isTemplate ? "/templates" : "/boards"}
                        >
                          {workspace.name}
                        </Link>
                        <IoChevronForwardSharp className="h-[10px] w-[10px] text-light-900 dark:text-dark-900" />
                        <Link
                          className="whitespace-nowrap font-bold text-light-900 dark:text-dark-950"
                          href={`${isTemplate ? "/templates" : "/boards"}/${boardPublicId}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleClose();
                          }}
                        >
                          {board?.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <CardDropdown
                          cardPublicId={cardPublicId}
                          isTemplate={isTemplate}
                          boardPublicId={board?.publicId}
                          cardCreatedBy={card?.createdBy}
                        />
                        <button
                          onClick={handleClose}
                          className="flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
                          aria-label={t`Close`}
                        >
                          <HiXMark className="h-5 w-5" />
                        </button>
                      </div>
                    </>
                  )}
                  {!card && !isLoading && (
                    <div className="flex w-full items-center justify-between">
                      <p className="font-bold text-light-900 dark:text-dark-900">
                        {t`Card not found`}
                      </p>
                      <button
                        onClick={handleClose}
                        className="flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
                        aria-label={t`Close`}
                      >
                        <HiXMark className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Body: main content + right sidebar */}
                <div className="flex min-h-0 flex-1">
                  {/* Main content - scrollable */}
                  <div className="scrollbar-thumb-rounded-[4px] scrollbar-track-rounded-[4px] flex-1 overflow-y-auto scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300">
                    <div className="mx-auto max-w-[700px] p-6 md:p-8">
                      <div className="mb-8 md:mt-2">
                        {!card && isLoading && (
                          <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                        )}
                        {card && (
                          <input
                            ref={titleRef}
                            type="text"
                            value={title}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={() => canEdit && saveTitle()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                titleRef.current?.blur();
                              }
                            }}
                            disabled={!canEdit}
                            className={`block w-full border-0 bg-transparent p-0 font-bold leading-relaxed text-neutral-900 focus:ring-0 dark:text-dark-1000 sm:text-[1.2rem] ${!canEdit ? "cursor-default" : ""}`}
                          />
                        )}
                      </div>
                      {card && (
                        <>
                          <div className="mb-10 flex w-full max-w-2xl flex-col justify-between">
                            <div className="mt-2">
                              <Editor
                                content={card.description}
                                onChange={
                                  canEdit ? handleDescriptionChange : undefined
                                }
                                onBlur={canEdit ? flushDescription : undefined}
                                workspaceMembers={workspaceMembers ?? []}
                                readOnly={!canEdit}
                              />
                            </div>
                          </div>
                          <Checklists
                            checklists={card.checklists}
                            cardPublicId={cardPublicId}
                            activeChecklistForm={activeChecklistForm}
                            setActiveChecklistForm={setActiveChecklistForm}
                            viewOnly={!canEdit}
                          />
                          {!isTemplate && (
                            <>
                              {card.attachments.length > 0 && (
                                <div className="mt-6">
                                  <AttachmentThumbnails
                                    attachments={card.attachments}
                                    cardPublicId={cardPublicId}
                                    isReadOnly={!canEdit}
                                  />
                                </div>
                              )}
                              {canEdit && (
                                <div className="mt-6">
                                  <AttachmentUpload
                                    cardPublicId={cardPublicId}
                                  />
                                </div>
                              )}
                            </>
                          )}
                          <div className="border-t border-light-300 pt-12 dark:border-dark-300">
                            <h2 className="text-md pb-4 font-medium text-light-1000 dark:text-dark-1000">
                              {t`Activity`}
                            </h2>
                            <ActivityList
                              cardPublicId={cardPublicId}
                              isLoading={!card}
                              isAdmin={workspace.role === "admin" || workspace.role === "super-admin"}
                            />
                            {!isTemplate && (
                              <div className="mt-6">
                                <NewCommentForm
                                  cardPublicId={cardPublicId}
                                  workspaceMembers={editorWorkspaceMembers}
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right sidebar */}
                  {card && (
                    <div className="w-[300px] shrink-0 overflow-y-auto border-l border-light-300 bg-light-100 p-6 dark:border-dark-300 dark:bg-dark-100">
                      <div className="mb-4 flex w-full flex-row">
                        <p className="my-2 w-[80px] text-sm font-medium text-light-900 dark:text-dark-900">
                          {t`List`}
                        </p>
                        <ListSelector
                          cardPublicId={cardPublicId}
                          lists={formattedLists}
                          isLoading={!card}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="mb-4 flex w-full flex-row">
                        <p className="my-2 w-[80px] text-sm font-medium text-light-900 dark:text-dark-900">
                          {t`Labels`}
                        </p>
                        <LabelSelector
                          cardPublicId={cardPublicId}
                          labels={formattedLabels}
                          isLoading={!card}
                          disabled={!canEdit}
                        />
                      </div>
                      {!isTemplate && (
                        <div className="mb-4 flex w-full flex-row">
                          <p className="my-2 w-[80px] text-sm font-medium text-light-900 dark:text-dark-900">
                            {t`Members`}
                          </p>
                          <MemberSelector
                            cardPublicId={cardPublicId}
                            members={formattedMembers}
                            isLoading={!card}
                            disabled={!canEdit}
                          />
                        </div>
                      )}
                      <div className="mb-4 flex w-full flex-row">
                        <p className="my-2 w-[80px] text-sm font-medium text-light-900 dark:text-dark-900">
                          {t`Due date`}
                        </p>
                        <DueDateSelector
                          cardPublicId={cardPublicId}
                          dueDate={card.dueDate}
                          isLoading={!card}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Sub-modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_LABEL"}
      >
        <LabelForm
          boardPublicId={board?.publicId ?? boardPublicId}
          refetch={refetchCard}
        />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "EDIT_LABEL"}
      >
        <LabelForm
          boardPublicId={board?.publicId ?? boardPublicId}
          refetch={refetchCard}
          isEdit
        />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_LABEL"}
      >
        <DeleteLabelConfirmation
          refetch={refetchCard}
          labelPublicId={entityId}
        />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_CARD"}
      >
        <DeleteCardConfirmation
          boardPublicId={board?.publicId ?? boardPublicId}
          cardPublicId={cardPublicId}
        />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_COMMENT"}
      >
        <DeleteCommentConfirmation
          cardPublicId={cardPublicId}
          commentPublicId={entityId}
        />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "ADD_CHECKLIST"}
      >
        <NewChecklistForm cardPublicId={cardPublicId} />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_CHECKLIST"}
      >
        <DeleteChecklistConfirmation
          cardPublicId={cardPublicId}
          checklistPublicId={entityId}
        />
      </Modal>
    </>
  );
}
