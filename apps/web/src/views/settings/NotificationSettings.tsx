import { t } from "@lingui/core/macro";
import { useCallback, useRef } from "react";

import { PageHead } from "~/components/PageHead";
import { useNotificationSettings } from "~/hooks/useNotificationSettings";

export default function NotificationSettings() {
  const { settings, updateSettings } = useNotificationSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleSound = useCallback(() => {
    const next = !settings.soundEnabled;
    updateSettings({ soundEnabled: next });
  }, [settings.soundEnabled, updateSettings]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      updateSettings({ soundVolume: vol });
    },
    [updateSettings],
  );

  const handleTestSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/new-message.mp3");
      }
      audioRef.current.volume = settings.soundVolume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // browser may block
      });
    } catch {
      // non-critical
    }
  }, [settings.soundVolume]);

  return (
    <>
      <PageHead title={t`Settings | Notifications`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        {/* ── Sound notifications ────────────────────────────────────────── */}
        <h2 className="mb-2 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Sound notifications`}
        </h2>
        <p className="mb-6 text-sm text-neutral-500 dark:text-dark-900">
          {t`Play a sound when a new message arrives from a customer. This setting is saved locally on this browser.`}
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-light-300 px-4 py-3 dark:border-dark-300">
          <div>
            <span className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
              {t`Enable sound`}
            </span>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-800">
              {t`Plays when a new chat message is received`}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.soundEnabled}
            onClick={handleToggleSound}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.soundEnabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-dark-400"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.soundEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Volume */}
        <div className="mt-4 rounded-lg border border-light-300 px-4 py-3 dark:border-dark-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
              {t`Volume`}
            </span>
            <span className="text-xs tabular-nums text-neutral-500 dark:text-dark-800">
              {Math.round(settings.soundVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.soundVolume}
            onChange={handleVolumeChange}
            disabled={!settings.soundEnabled}
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-light-200 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-dark-300"
          />
        </div>

        {/* Test button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleTestSound}
            disabled={!settings.soundEnabled}
            className="inline-flex items-center gap-2 rounded-lg border border-light-300 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-light-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-300 dark:text-dark-1000 dark:hover:bg-dark-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M10 3.75a.75.75 0 0 0-1.264-.546L5.203 6H2.667a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 1.5 10c0 1.28.344 2.48.948 3.52a.75.75 0 0 0 .7.48h2.535l3.533 2.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 1 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
              <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 1 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
            </svg>
            {t`Test sound`}
          </button>
        </div>

        {/* Info note */}
        <p className="mt-6 text-xs text-neutral-400 dark:text-dark-700">
          {t`These preferences are stored locally in your browser. They are not synced across devices or accounts.`}
        </p>
      </div>
    </>
  );
}
