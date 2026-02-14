import Link from "next/link";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { IoChevronForwardSharp } from "react-icons/io5";
import { HiXMark } from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import Editor from "~/components/Editor";
import FeedbackModal from "~/components/FeedbackModal";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { EditYouTubeModal } from "~/components/YouTubeEmbed/EditYouTubeModal";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { DeleteLabelConfirmation } from "../../components/DeleteLabelConfirmation";
import ActivityList from "./components/ActivityList";
import { AttachmentThumbnails } from "./components/AttachmentThumbnails";
import { AttachmentUpload } from "./components/AttachmentUpload";
import Checklists from "./components/Checklists";
import { DeleteCardConfirmation } from "./components/DeleteCardConfirmation";
import { DeleteChecklistConfirmation } from "./components/DeleteChecklistConfirmation";
import { DeleteCommentConfirmation } from "./components/DeleteCommentConfirmation";
import Dropdown from "./components/Dropdown";
import { DueDateSelector } from "./components/DueDateSelector";
import LabelSelector from "./components/LabelSelector";
import ListSelector from "./components/ListSelector";
import MemberSelector from "./components/MemberSelector";
import { NewChecklistForm } from "./components/NewChecklistForm";
import NewCommentForm from "./components/NewCommentForm";

export function CardRightPanel({ isTemplate }: { isTemplate?: boolean }) {
  const router = useRouter();
  const { canEditCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card } = api.card.byId.useQuery(
    { cardPublicId: cardId ?? "" },
    { enabled: !!cardId && cardId.length >= 12 },
  );

  const isCreator = card?.createdBy && session?.user.id === card.createdBy;
  const canEdit = canEditCard || isCreator;

  const board = card?.list.board;
  const labels = board?.labels;
  const workspaceMembers = board?.workspace.members;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  const formattedLabels =
    labels?.map((label) => {
      const isSelected = selectedLabels?.some(
        (selectedLabel) => selectedLabel.publicId === label.publicId,
      );

      return {
        key: label.publicId,
        value: label.name,
        selected: isSelected ?? false,
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
      };
    }) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => {
      const isSelected = selectedMembers?.some(
        (assignedMember) => assignedMember.publicId === member.publicId,
      );

      return {
        key: member.publicId,
        value: formatMemberDisplayName(
          member.user?.name ?? null,
          member.user?.email ?? member.email,
        ),
        imageUrl: member.user?.image
          ? getAvatarUrl(member.user.image)
          : undefined,
        selected: isSelected ?? false,
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
      };
    }) ?? [];

  return (
    <div className="h-full w-[360px] border-l-[1px] border-light-300 bg-light-50 p-8 text-light-900 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900">
      <div className="mb-4 flex w-full flex-row pt-[18px]">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`List`}</p>
        <ListSelector
          cardPublicId={cardId ?? ""}
          lists={formattedLists}
          isLoading={!card}
          disabled={!canEdit}
        />
      </div>
      <div className="mb-4 flex w-full flex-row">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Labels`}</p>
        <LabelSelector
          cardPublicId={cardId ?? ""}
          labels={formattedLabels}
          isLoading={!card}
          disabled={!canEdit}
        />
      </div>
      {!isTemplate && (
        <div className="mb-4 flex w-full flex-row">
          <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Members`}</p>
          <MemberSelector
            cardPublicId={cardId ?? ""}
            members={formattedMembers}
            isLoading={!card}
            disabled={!canEdit}
          />
        </div>
      )}
      <div className="mb-4 flex w-full flex-row">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Due date`}</p>
        <DueDateSelector
          cardPublicId={cardId ?? ""}
          dueDate={card?.dueDate}
          isLoading={!card}
          disabled={!canEdit}
        />
      </div>
    </div>
  );
}

export default function CardPage({ isTemplate }: { isTemplate?: boolean }) {
  const router = useRouter();
  const utils = api.useUtils();
  const {
    modalContentType,
    entityId,
    getModalState,
    clearModalState,
    isOpen,
    modalStates,
  } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const { canEditCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );

  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardId ?? "" },
    { enabled: !!cardId && cardId.length >= 12 },
  );

  const isCreator = card?.createdBy && session?.user.id === card.createdBy;
  const canEdit = canEditCard || isCreator;

  const refetchCard = async () => {
    if (cardId) await utils.card.byId.refetch({ cardPublicId: cardId });
  };

  const board = card?.list.board;
  const workspaceMembers = board?.workspace.members;
  const boardId = board?.publicId;

  const editorWorkspaceMembers =
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

  // ── Local-first state ──
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localDesc, setLocalDesc] = useState<string | null>(null);
  const lastSavedTitle = useRef<string>("");
  const lastSavedDesc = useRef<string>("");

  // Seed once from server
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

  const updateCard = api.card.update.useMutation({
    onMutate: (args) => {
      if (!cardId) return;

      const prevCard = utils.card.byId.getData({ cardPublicId: cardId });

      utils.card.byId.setData({ cardPublicId: cardId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          ...(args.title !== undefined && { title: args.title }),
          ...(args.description !== undefined && {
            description: args.description,
          }),
        };
      });

      return { prevCard };
    },
    onError: (_err, _args, context) => {
      if (context?.prevCard && cardId) {
        utils.card.byId.setData({ cardPublicId: cardId }, context.prevCard);
      }
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: () => {
      if (cardId) {
        void utils.card.byId.invalidate({ cardPublicId: cardId });
        void utils.card.getActivities.invalidate({ cardPublicId: cardId });
      }
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
      if (cardId) {
        void utils.card.byId.invalidate({ cardPublicId: cardId });
      }
    },
  });

  // ── Save helpers ──
  const saveTitle = useCallback(
    (newTitle: string) => {
      if (!cardId || newTitle === lastSavedTitle.current) return;
      if (newTitle.length === 0) return; // Server requires min(1)
      lastSavedTitle.current = newTitle;
      updateCard.mutate({ cardPublicId: cardId, title: newTitle });
    },
    [updateCard, cardId],
  );

  const saveDescription = useCallback(
    (newDesc: string) => {
      if (!cardId || newDesc === lastSavedDesc.current) return;
      lastSavedDesc.current = newDesc;
      updateCard.mutate({ cardPublicId: cardId, description: newDesc });
    },
    [updateCard, cardId],
  );

  // Debounced description save
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleDescriptionChange = useCallback(
    (value: string) => {
      setLocalDesc(value);
      clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => saveDescription(value), 800);
    },
    [saveDescription],
  );

  const flushDescription = useCallback(() => {
    clearTimeout(descTimerRef.current);
    const current = localDesc ?? "";
    if (current !== lastSavedDesc.current) {
      saveDescription(current);
    }
  }, [localDesc, saveDescription]);

  // Cleanup
  useEffect(() => () => clearTimeout(descTimerRef.current), []);

  // Auto-label after creating a new label
  useEffect(() => {
    const newLabelId = modalStates.NEW_LABEL_CREATED;
    if (newLabelId && cardId) {
      const isAlreadyAdded = card?.labels.some(
        (label) => label.publicId === newLabelId,
      );

      if (!isAlreadyAdded) {
        addOrRemoveLabel.mutate({
          cardPublicId: cardId,
          labelPublicId: newLabelId,
        });
      }
      clearModalState("NEW_LABEL_CREATED");
    }
  }, [modalStates.NEW_LABEL_CREATED, card, cardId]);

  // Open the new item form after creating a new checklist
  useEffect(() => {
    if (!card) return;
    const state = getModalState("ADD_CHECKLIST");
    const createdId: string | undefined = state?.createdChecklistId;
    if (createdId) {
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, getModalState, clearModalState]);

  // Focus title on load
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (card && titleRef.current) titleRef.current.focus();
  }, [!!card]);

  if (!cardId) return <></>;

  return (
    <>
      <PageHead
        title={t`${card?.title ?? t`Card`} | ${board?.name ?? t`Board`}`}
      />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Full-width top strip with board link and dropdown */}
        <div className="flex w-full items-center justify-between border-b-[1px] border-light-300 bg-light-50 px-8 py-2 dark:border-dark-300 dark:bg-dark-50">
          {!card && isLoading && (
            <div className="flex space-x-2">
              <div className="h-[1.5rem] w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
            </div>
          )}
          {card && (
            <>
              <div className="flex items-center gap-1">
                <Link
                  className="whitespace-nowrapleading-[1.5rem] text-sm font-bold text-light-900 dark:text-dark-950"
                  href={`${isTemplate ? "/templates" : "/boards"}`}
                >
                  {workspace.name}
                </Link>
                <IoChevronForwardSharp className="h-[10px] w-[10px] text-light-900 dark:text-dark-900" />
                <Link
                  className="whitespace-nowrap text-sm font-bold leading-[1.5rem] text-light-900 dark:text-dark-950"
                  href={`${isTemplate ? "/templates" : "/boards"}/${board?.publicId}`}
                >
                  {board?.name}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Dropdown
                  cardPublicId={cardId}
                  isTemplate={isTemplate}
                  boardPublicId={boardId}
                  cardCreatedBy={card?.createdBy}
                />
                <Link
                  href={`/${isTemplate ? "templates" : "boards"}/${boardId}`}
                  className="flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
                  aria-label={t`Close`}
                >
                  <HiXMark className="h-5 w-5" />
                </Link>
              </div>
            </>
          )}
          {!card && !isLoading && (
            <p className="block p-0 py-0 font-bold leading-[1.5rem] tracking-tight text-light-900 dark:text-dark-900 sm:text-[1rem]">
              {t`Card not found`}
            </p>
          )}
        </div>
        <div className="scrollbar-thumb-rounded-[4px] scrollbar-track-rounded-[4px] w-full flex-1 overflow-y-auto scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 hover:scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300 dark:hover:scrollbar-thumb-dark-300">
          <div className="p-auto mx-auto flex h-full w-full max-w-[800px] flex-col">
            <div className="p-6 md:p-8">
              <div className="mb-8 md:mt-4">
                {!card && isLoading && (
                  <div className="flex space-x-2">
                    <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                  </div>
                )}
                {card && (
                  <input
                    ref={titleRef}
                    type="text"
                    value={title}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={() => canEdit && saveTitle(title)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        titleRef.current?.blur();
                      }
                    }}
                    disabled={!canEdit}
                    className={`block w-full border-0 bg-transparent p-0 py-0 font-bold leading-relaxed text-neutral-900 focus:ring-0 dark:text-dark-1000 sm:text-[1.2rem] ${!canEdit ? "cursor-default" : ""}`}
                  />
                )}
                {!card && !isLoading && (
                  <p className="block p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                    {t`Card not found`}
                  </p>
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
                    cardPublicId={cardId}
                    activeChecklistForm={activeChecklistForm}
                    setActiveChecklistForm={setActiveChecklistForm}
                    viewOnly={!canEdit}
                  />
                  {!isTemplate && (
                    <>
                      {card?.attachments.length > 0 && (
                        <div className="mt-6">
                          <AttachmentThumbnails
                            attachments={card.attachments}
                            cardPublicId={cardId ?? ""}
                            isReadOnly={!canEdit}
                          />
                        </div>
                      )}
                      {canEdit && (
                        <div className="mt-6">
                          <AttachmentUpload cardPublicId={cardId} />
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t-[1px] border-light-300 pt-12 dark:border-dark-300">
                    <h2 className="text-md pb-4 font-medium text-light-1000 dark:text-dark-1000">
                      {t`Activity`}
                    </h2>
                    <div>
                      <ActivityList
                        cardPublicId={cardId}
                        isLoading={!card}
                        isAdmin={workspace.role === "admin" || workspace.role === "super-admin"}
                      />
                    </div>
                    {!isTemplate && (
                      <div className="mt-6">
                        <NewCommentForm
                          cardPublicId={cardId}
                          workspaceMembers={editorWorkspaceMembers}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <>
          <Modal
            modalSize="md"
            isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
          >
            <FeedbackModal />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_LABEL"}
          >
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchCard} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_LABEL"}
          >
            <LabelForm
              boardPublicId={boardId ?? ""}
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
              boardPublicId={boardId ?? ""}
              cardPublicId={cardId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_COMMENT"}
          >
            <DeleteCommentConfirmation
              cardPublicId={cardId}
              commentPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "ADD_CHECKLIST"}
          >
            <NewChecklistForm cardPublicId={cardId} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CHECKLIST"}
          >
            <DeleteChecklistConfirmation
              cardPublicId={cardId}
              checklistPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_YOUTUBE"}
          >
            <EditYouTubeModal />
          </Modal>
        </>
      </div>
    </>
  );
}
