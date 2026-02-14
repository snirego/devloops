import { useEffect, useState } from "react";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";

interface RenameThreadFormProps {
  threadPublicId: string;
  currentTitle: string;
  onSuccess?: () => void;
}

export function RenameThreadForm({
  threadPublicId,
  currentTitle,
  onSuccess,
}: RenameThreadFormProps) {
  const { closeModal } = useModal();
  const [title, setTitle] = useState(currentTitle);

  const updateTitle = api.chat.updateTitle.useMutation({
    onSuccess: () => {
      onSuccess?.();
      closeModal();
    },
  });

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("#rename-thread-input");
    if (el) el.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === currentTitle) {
      closeModal();
      return;
    }
    updateTitle.mutate({ threadPublicId, title: trimmed });
  };

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            Rename conversation
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
            onClick={() => closeModal()}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <Input
          id="rename-thread-input"
          placeholder="Conversation name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              closeModal();
            }
          }}
        />
      </div>
      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Button
          disabled={updateTitle.isPending || !title.trim()}
          onClick={handleSubmit}
        >
          {updateTitle.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
