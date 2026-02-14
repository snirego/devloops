import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "devloops_notification_settings";

export interface NotificationSettings {
  /** Play a sound when a new message arrives from an external user */
  soundEnabled: boolean;
  /** Volume level for the notification sound (0 – 1) */
  soundVolume: number;
}

const DEFAULTS: NotificationSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
};

function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      soundEnabled: parsed.soundEnabled ?? DEFAULTS.soundEnabled,
      soundVolume: parsed.soundVolume ?? DEFAULTS.soundVolume,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function persistSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage blocked
  }
}

/**
 * Read notification settings synchronously (outside of React).
 * Used by the sound helper in useRealtimeMessages.
 */
export function getNotificationSettings(): NotificationSettings {
  return loadSettings();
}

/**
 * React hook for notification preferences stored in localStorage.
 * Returns the current settings and a setter that persists immediately.
 */
export function useNotificationSettings() {
  const [settings, setSettingsState] = useState<NotificationSettings>(DEFAULTS);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<NotificationSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...patch };
        persistSettings(next);
        return next;
      });
    },
    [],
  );

  return { settings, updateSettings };
}
