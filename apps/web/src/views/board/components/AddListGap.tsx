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

interface AddListGapProps {
  boardPublicId: string;
  queryParams: QueryParams;
  canCreate: boolean;
}

export function AddListGap({
  boardPublicId,
  queryParams,
  canCreate,
}: AddListGapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const createList = api.list.create.useMutation({
    onMutate: (args) => {
      void utils.board.byId.cancel();
      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const newList = {
          publicId: generateUID(),
          name: args.name,
          boardId: 1,
          boardPublicId,
          cards: [],
          index: oldBoard.lists.length,
        };

        return { ...oldBoard, lists: [...oldBoard.lists, newList] };
      });

      return { previousState: currentState };
    },
    onError: (_error, _vars, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to create list`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: () => {
      void utils.board.byId.invalidate(queryParams);
    },
  });

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setIsEditing(false);
      setName("");
      return;
    }

    createList.mutate({
      name: trimmed,
      boardPublicId,
    });

    setName("");
    setIsEditing(false);
  }, [name, createList, boardPublicId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setName("");
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!canCreate) return;
    e.stopPropagation();
    setIsEditing(true);
    setIsHovered(false);
  };

  if (!canCreate) return null;

  if (isEditing) {
    return (
      <div
        className="flex h-fit min-w-[18rem] max-w-[18rem] items-start px-[3px]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="w-full rounded-md border border-light-400 bg-light-300 p-2 dark:border-dark-300 dark:bg-dark-100">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
            placeholder={t`List name...`}
            className="w-full rounded-md border border-light-200 bg-light-50 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm outline-none ring-2 ring-inset ring-blue-400 placeholder:text-light-600 dark:border-dark-200 dark:bg-dark-200 dark:text-dark-1000 dark:ring-blue-500 dark:placeholder:text-dark-600"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex h-auto min-h-[4rem] cursor-pointer items-stretch px-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="relative flex w-5 items-stretch">
        <div
          className={`absolute inset-y-0 left-1/2 -translate-x-1/2 transition-opacity duration-150 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative flex h-full flex-col items-center">
            <div className="w-[2px] flex-1 rounded bg-blue-400 dark:bg-blue-500" />
            <div className="absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border-[2px] border-blue-400 bg-light-50 dark:border-blue-500 dark:bg-dark-200">
              <HiOutlinePlusSmall className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="w-[2px] flex-1 rounded bg-blue-400 dark:bg-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
