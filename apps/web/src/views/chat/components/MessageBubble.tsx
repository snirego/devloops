import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
  HiOutlineCpuChip,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineClipboard,
  HiOutlineLightBulb,
  HiOutlineBugAnt,
} from "react-icons/hi2";

import ChatAvatar from "./ChatAvatar";
import ContextMenu from "./ContextMenu";
import type { ContextMenuEntry } from "./ContextMenu";

/** Render text with @mentions highlighted */
function RenderText({
  text,
  mentionClass,
}: {
  text: string;
  mentionClass: string;
}) {
  // Split on @Name patterns (word chars, spaces inside a name)
  const parts = text.split(/(@\S+(?:\s\S+)?)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className={mentionClass}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

interface MessageBubbleProps {
  publicId: string;
  senderType: "user" | "internal";
  senderName?: string | null;
  visibility: "public" | "internal";
  rawText: string;
  createdAt: string | Date;
  metadataJson?: Record<string, unknown> | null;
  isFailed?: boolean;
  onRetry?: () => void;
  onEdit?: (publicId: string, newText: string) => void;
  onDelete?: (publicId: string) => void;
  onCreateWorkItem?: (publicId: string, type: "Bug" | "Feature") => void;
}

export default function MessageBubble({
  publicId,
  senderType,
  senderName,
  visibility,
  rawText,
  createdAt,
  metadataJson,
  isFailed,
  onRetry,
  onEdit,
  onDelete,
  onCreateWorkItem,
}: MessageBubbleProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(rawText);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const isInternal = senderType === "internal";
  const isInternalNote = visibility === "internal";
  const isSystem =
    (metadataJson?.type as string)?.startsWith("system_") ?? false;
  const hasMentions =
    Array.isArray(metadataJson?.mentions) &&
    (metadataJson.mentions as string[]).length > 0;

  // Focus textarea on edit start
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [isEditing]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Don't show context menu for system messages
      if (isSystem) return;
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY });
    },
    [isSystem],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(rawText);
  }, [rawText]);

  const handleStartEdit = useCallback(() => {
    setEditText(rawText);
    setIsEditing(true);
  }, [rawText]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== rawText && onEdit) {
      onEdit(publicId, trimmed);
    }
    setIsEditing(false);
  }, [editText, rawText, publicId, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(rawText);
  }, [rawText]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(publicId);
  }, [publicId, onDelete]);

  // Build context menu items
  const ctxItems: ContextMenuEntry[] = [
    {
      label: "Copy text",
      icon: <HiOutlineClipboard className="h-3.5 w-3.5" />,
      onClick: handleCopy,
    },
  ];

  // Only allow editing internal messages (your own)
  if (isInternal && onEdit) {
    ctxItems.push({
      label: "Edit message",
      icon: <HiOutlinePencilSquare className="h-3.5 w-3.5" />,
      onClick: handleStartEdit,
    });
  }

  // Work item creation from any message
  if (onCreateWorkItem) {
    ctxItems.push(
      { separator: true },
      {
        label: "Create feature from this",
        icon: <HiOutlineLightBulb className="h-3.5 w-3.5" />,
        onClick: () => onCreateWorkItem(publicId, "Feature"),
      },
      {
        label: "Create bug from this",
        icon: <HiOutlineBugAnt className="h-3.5 w-3.5" />,
        onClick: () => onCreateWorkItem(publicId, "Bug"),
      },
    );
  }

  if (onDelete) {
    ctxItems.push(
      { separator: true },
      {
        label: "Delete message",
        icon: <HiOutlineTrash className="h-3.5 w-3.5" />,
        onClick: handleDelete,
        variant: "danger",
      },
    );
  }

  // System message (AI suggestion, etc.)
  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-2">
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 dark:bg-indigo-950/30">
          <HiOutlineCpuChip className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-xs text-indigo-700 dark:text-indigo-300">
            {rawText}
          </span>
        </div>
      </div>
    );
  }

  // Inline editing textarea
  const renderEditForm = () => (
    <div className="space-y-1.5">
      <textarea
        ref={editRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={handleEditKeyDown}
        className="w-full resize-none rounded border border-indigo-300 bg-white px-2 py-1.5 text-sm text-light-900 outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-700 dark:bg-dark-100 dark:text-dark-900"
        rows={Math.min(editText.split("\n").length + 1, 6)}
      />
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={handleCancelEdit}
          className="rounded px-2 py-0.5 text-[10px] font-medium text-light-800 hover:bg-light-100 dark:text-dark-800 dark:hover:bg-dark-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveEdit}
          className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
      <p className="text-[9px] text-light-800 dark:text-dark-800">
        Enter to save, Esc to cancel, Shift+Enter for new line
      </p>
    </div>
  );

  // Internal note (private team comment)
  if (isInternalNote) {
    return (
      <div className="flex justify-end px-4 py-1.5" onContextMenu={handleContextMenu}>
        <div className="flex max-w-[75%] flex-row-reverse gap-2">
          <ChatAvatar name={senderName} size="sm" className="mt-1" />
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="mb-1 flex items-center gap-1.5">
              <HiOutlineLockClosed className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Internal Note
              </span>
              {senderName && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  {" "}
                  - {senderName}
                </span>
              )}
            </div>
            {isEditing ? (
              renderEditForm()
            ) : (
              <p className="whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-100">
                <RenderText
                  text={rawText}
                  mentionClass="font-semibold text-indigo-700 dark:text-indigo-300"
                />
              </p>
            )}
            <span className="mt-1 block text-right text-[10px] text-amber-500">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={ctxItems}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </div>
    );
  }

  // Regular message
  return (
    <div
      className={`flex px-4 py-1.5 ${isInternal ? "justify-end" : "justify-start"}`}
      onContextMenu={handleContextMenu}
    >
      <div className={`flex max-w-[75%] gap-2 ${isInternal ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <ChatAvatar name={senderName} size="sm" className="mt-1" />

        <div>
          <div
            className={`rounded-lg px-3 py-2 ${
              isInternal
                ? "bg-indigo-600 text-white"
                : "bg-light-100 text-light-900 dark:bg-dark-200 dark:text-dark-900"
            } ${isFailed ? "opacity-60" : ""}`}
          >
            {senderName && (
              <span
                className={`mb-0.5 block text-[10px] font-semibold ${
                  isInternal ? "text-indigo-200" : "text-light-900 dark:text-dark-900"
                }`}
              >
                {senderName}
              </span>
            )}
            {isEditing ? (
              renderEditForm()
            ) : (
              <p className="whitespace-pre-wrap text-sm">
                <RenderText
                  text={rawText}
                  mentionClass={
                    isInternal
                      ? "font-semibold text-indigo-200"
                      : "font-semibold text-indigo-600 dark:text-indigo-400"
                  }
                />
              </p>
            )}
            <div className="mt-1 flex items-center justify-end gap-1">
              {isFailed && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-0.5 text-red-300 hover:text-red-100"
                >
                  <HiOutlineExclamationTriangle className="h-3 w-3" />
                  <span className="text-[10px]">Retry</span>
                </button>
              )}
              <span
                className={`text-[10px] ${
                  isInternal ? "text-indigo-200" : "text-light-800 dark:text-dark-800"
                }`}
              >
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
