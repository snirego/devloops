import { t } from "@lingui/core/macro";
import { useRef, useState } from "react";
import {
  HiOutlineArrowUpTray,
  HiOutlineDocumentText,
  HiOutlineTrash,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";
import { env } from "next-runtime-env";

import type { KnowledgeFile } from "@kan/db/schema";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface KnowledgeFilesSectionProps {
  files: KnowledgeFile[];
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "text/csv": "CSV",
  "application/json": "JSON",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/msword": "DOC",
  "application/vnd.ms-excel": "XLS",
};

const ACCEPT =
  ".pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,text/plain,text/markdown,text/csv,application/pdf,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function KnowledgeFilesSection({
  files,
  disabled = false,
}: KnowledgeFilesSectionProps) {
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteFile = api.workspace.deleteKnowledgeFile.useMutation({
    onSuccess: async () => {
      await utils.workspace.byId.invalidate({
        workspacePublicId: workspace.publicId,
      });
    },
    onError: () => {
      showPopup({
        header: t`Delete failed`,
        message: t`Could not delete file. Please try again.`,
        icon: "error",
      });
    },
  });

  const uploadFile = async (file: File) => {
    setUploading(true);

    try {
      const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
      const response = await fetch(
        `${baseUrl}/api/upload/knowledge?workspacePublicId=${encodeURIComponent(workspace.publicId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Content-Length": String(file.size),
            "x-original-filename": file.name,
          },
          body: file,
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as Record<string, string>).error ?? "Upload failed",
        );
      }

      await utils.workspace.byId.invalidate({
        workspacePublicId: workspace.publicId,
      });

      showPopup({
        header: t`File uploaded`,
        message: t`Your file has been uploaded and will be used as AI context.`,
        icon: "success",
      });
    } catch (err) {
      showPopup({
        header: t`Upload failed`,
        message:
          err instanceof Error
            ? err.message
            : t`Failed to upload file. Please try again.`,
        icon: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    await uploadFile(file);
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await deleteFile.mutateAsync({
        workspacePublicId: workspace.publicId,
        fileId,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading || disabled) return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) await uploadFile(droppedFile);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-light-600 dark:text-dark-600">
        {t`Upload documents like product specs, style guides, or API docs. The AI will use them as additional context when generating work items.`}
      </p>

      {/* Upload area */}
      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={twMerge(
              "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
              isDragging
                ? "border-brand-400 bg-brand-50/50 dark:border-brand-600 dark:bg-brand-900/10"
                : "border-light-300 hover:border-light-400 dark:border-dark-400 dark:hover:border-dark-500",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            <div
              className={twMerge(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                isDragging
                  ? "bg-brand-100 dark:bg-brand-900/20"
                  : "bg-light-100 group-hover:bg-light-200 dark:bg-dark-300 dark:group-hover:bg-dark-400",
              )}
            >
              <HiOutlineArrowUpTray
                className={twMerge(
                  "h-5 w-5",
                  isDragging
                    ? "text-brand-500"
                    : "text-light-600 dark:text-dark-600",
                )}
              />
            </div>
            {uploading ? (
              <p className="text-sm text-light-700 dark:text-dark-700">
                {t`Uploading...`}
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-light-800 dark:text-dark-800">
                  {t`Drop a file here or click to browse`}
                </p>
                <p className="text-xs text-light-500 dark:text-dark-500">
                  {t`PDF, Word, Excel, TXT, Markdown, CSV, JSON — up to 20 MB`}
                </p>
              </>
            )}
          </div>
        </>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-light-200 bg-light-50 px-3 py-2.5 dark:border-dark-300 dark:bg-dark-200"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-light-200 dark:bg-dark-400">
                <HiOutlineDocumentText className="h-4 w-4 text-light-700 dark:text-dark-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-light-1000 dark:text-dark-1000">
                  {file.originalFilename}
                </p>
                <p className="text-xs text-light-500 dark:text-dark-500">
                  {FILE_TYPE_LABELS[file.contentType] ?? "File"}
                  {" · "}
                  {formatFileSize(file.size)}
                  {" · "}
                  {formatDate(file.uploadedAt)}
                </p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  className={twMerge(
                    "flex-shrink-0 rounded-md p-1.5 text-light-500 transition-colors hover:bg-light-200 hover:text-red-500 dark:text-dark-500 dark:hover:bg-dark-400 dark:hover:text-red-400",
                    deletingId === file.id && "pointer-events-none opacity-40",
                  )}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && disabled && (
        <p className="py-4 text-center text-sm text-light-500 dark:text-dark-500">
          {t`No files uploaded yet.`}
        </p>
      )}
    </div>
  );
}
