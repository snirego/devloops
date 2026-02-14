import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlinePlusSmall } from "react-icons/hi2";

import { generateUID } from "@kan/shared/utils";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
}

interface AddCardGapProps {
  listPublicId: string;
  insertAtIndex: number;
  totalCards: number;
  queryParams: QueryParams;
  canCreate: boolean;
}

export function AddCardGap({
  listPublicId,
  insertAtIndex,
  totalCards,
  queryParams,
  canCreate,
}: AddCardGapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const createCard = api.card.create.useMutation({
    onMutate: (args) => {
      void utils.board.byId.cancel();
      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = oldBoard.lists.map((list) => {
          if (list.publicId === listPublicId) {
            const newCard = {
              publicId: `PLACEHOLDER_${generateUID()}`,
              title: args.title,
              listId: 0,
              description: "",
              dueDate: null,
              labels: [] as { name: string; colourCode: string | null }[],
              members: [] as {
                publicId: string;
                email: string;
                deletedAt: null;
                user: {
                  name: string | null;
                  email: string;
                  image: string | null;
                } | null;
              }[],
              checklists: [] as {
                publicId: string;
                name: string;
                items: {
                  publicId: string;
                  title: string;
                  completed: boolean;
                  index: number;
                }[];
              }[],
              comments: [] as { publicId: string }[],
              attachments: [] as { publicId: string }[],
              _filteredLabels: [] as { publicId: string }[],
              _filteredMembers: [] as { publicId: string }[],
              index: insertAtIndex,
            };

            const updatedCards = [...list.cards];
            updatedCards.splice(insertAtIndex, 0, newCard);
            return { ...list, cards: updatedCards };
          }
          return list;
        });

        return { ...oldBoard, lists: updatedLists };
      });

      return { previousState: currentState };
    },
    onError: (error, _vars, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to create card`,
        message:
          error.data?.zodError?.fieldErrors.title?.[0]
            ? `${error.data.zodError.fieldErrors.title[0].replace("String", "Title")}`
            : t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSuccess: () => {
      void utils.board.byId.invalidate(queryParams);
    },
  });

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setIsEditing(false);
      setTitle("");
      return;
    }

    const position: "start" | "end" =
      insertAtIndex === 0 ? "start" : "end";

    createCard.mutate({
      title: trimmed,
      description: "",
      listPublicId,
      labelPublicIds: [],
      memberPublicIds: [],
      position,
      dueDate: null,
    });

    setTitle("");
    setIsEditing(false);
  }, [title, createCard, listPublicId, insertAtIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setTitle("");
    }
  };

  const handleClick = () => {
    if (!canCreate) return;
    setIsEditing(true);
    setIsHovered(false);
  };

  if (!canCreate) return null;

  if (isEditing) {
    return (
      <div className="py-0.5">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder={t`Card title...`}
          className="w-full rounded-md border-0 bg-light-50 px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-2 ring-blue-400 placeholder:text-light-600 dark:bg-dark-200 dark:text-dark-1000 dark:ring-blue-500 dark:placeholder:text-dark-600"
        />
      </div>
    );
  }

  // For the first gap (above first card) or the only gap (empty list),
  // use a taller hover zone so it's easier to discover.
  const isTopOrEmpty = insertAtIndex === 0;
  const isEmpty = totalCards === 0;

  return (
    <div
      className={`group relative flex cursor-pointer items-center ${
        isEmpty ? "min-h-[2.5rem]" : isTopOrEmpty ? "py-1.5" : "py-1"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 transition-opacity duration-150 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative flex items-center">
          <div className="h-[2px] flex-1 rounded bg-blue-400 dark:bg-blue-500" />
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border-[2px] border-blue-400 bg-light-300 dark:border-blue-500 dark:bg-dark-100">
            <HiOutlinePlusSmall className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
