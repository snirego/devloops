import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "devloops_thread_read_timestamps";

/**
 * Custom event name used to synchronize read-status state across multiple
 * hook instances *within the same tab*. The native `storage` event only
 * fires across tabs, so we dispatch our own event to keep every mounted
 * `useThreadReadStatus` hook in sync when any one of them calls `markAsRead`.
 */
const SYNC_EVENT = "devloops_thread_read_sync";

/**
 * Lightweight client-side read tracking using localStorage.
 * Stores { [threadPublicId]: ISO timestamp of last read } in a single key.
 *
 * Returns helpers to mark a thread as read and to compute unread counts.
 */

interface ReadTimestamps {
  [threadPublicId: string]: string; // ISO string
}

function getReadTimestamps(): ReadTimestamps {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setReadTimestamps(timestamps: ReadTimestamps) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // storage full or blocked
  }
}

/**
 * Get the last-read timestamp for a specific thread.
 */
export function getLastReadTimestamp(threadPublicId: string): string | null {
  const all = getReadTimestamps();
  return all[threadPublicId] ?? null;
}

/**
 * Hook that provides unread count per thread and a function to mark threads as read.
 */
export function useThreadReadStatus() {
  const [readTs, setReadTs] = useState<ReadTimestamps>({});
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    setReadTs(getReadTimestamps());
    initialized.current = true;
  }, []);

  // Sync when another hook instance in the same tab calls markAsRead
  useEffect(() => {
    const handleSync = () => {
      setReadTs(getReadTimestamps());
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) handleSync();
    };

    // Same-tab custom event
    window.addEventListener(SYNC_EVENT, handleSync);
    // Cross-tab native storage event
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  /**
   * Mark a thread as fully read (sets timestamp to now).
   */
  const markAsRead = useCallback((threadPublicId: string) => {
    const now = new Date().toISOString();
    setReadTs((prev) => {
      const next = { ...prev, [threadPublicId]: now };
      setReadTimestamps(next);
      return next;
    });
    // Notify other hook instances in this tab
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  /**
   * Get the number of unread messages for a thread, given its messages.
   * Messages are expected to have a `createdAt` string (ISO) and `senderType`.
   * Only counts messages from external users (`senderType === "user"`).
   */
  const getUnreadCount = useCallback(
    (
      threadPublicId: string,
      messages: Array<{ createdAt: string | Date; senderType: string }>,
    ): number => {
      const lastRead = readTs[threadPublicId];
      if (!lastRead) {
        // Never opened — all external user messages are unread
        return messages.filter((m) => m.senderType === "user").length;
      }
      const lastReadDate = new Date(lastRead);
      return messages.filter(
        (m) =>
          m.senderType === "user" && new Date(m.createdAt) > lastReadDate,
      ).length;
    },
    [readTs],
  );

  /**
   * Get the last-read ISO timestamp for a thread (for divider placement).
   */
  const getLastRead = useCallback(
    (threadPublicId: string): string | null => {
      return readTs[threadPublicId] ?? null;
    },
    [readTs],
  );

  return { markAsRead, getUnreadCount, getLastRead };
}
