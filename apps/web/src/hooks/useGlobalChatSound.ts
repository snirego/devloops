import { useEffect, useRef } from "react";

import { getSupabaseBrowserClient } from "@kan/auth/client";

import { getNotificationSettings } from "~/hooks/useNotificationSettings";

/**
 * Global Supabase Realtime listener that plays a notification sound
 * whenever an external user sends a message on ANY thread.
 *
 * This is separate from the per-thread useRealtimeMessages hook so that
 * the sound plays even when the dashboard user is viewing a different
 * thread (or no thread at all).
 *
 * Mount this once in the chat view root.
 */

let _notifAudio: HTMLAudioElement | null = null;
let _audioWarmedUp = false;

/** Pre-load the audio element so .play() works after user interaction. */
function ensureAudio() {
  if (!_notifAudio) {
    _notifAudio = new Audio("/sounds/new-message.mp3");
    _notifAudio.preload = "auto";
  }
  return _notifAudio;
}

/**
 * "Warm up" the audio context on first user interaction so that
 * subsequent programmatic .play() calls are not blocked by autoplay policy.
 */
function warmUpAudio() {
  if (_audioWarmedUp) return;
  _audioWarmedUp = true;
  const audio = ensureAudio();
  audio.volume = 0;
  audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
}

function playSound() {
  try {
    const prefs = getNotificationSettings();
    if (!prefs.soundEnabled) return;

    const audio = ensureAudio();
    audio.volume = prefs.soundVolume;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browser may block autoplay — silently ignore
    });
  } catch {
    // Non-critical
  }
}

export function useGlobalChatSound() {
  // Throttle to at most one sound per 2 seconds to avoid rapid-fire
  const lastPlayRef = useRef(0);

  // Warm up audio on first user interaction (click/keydown) so that
  // the browser autoplay policy allows future .play() calls.
  useEffect(() => {
    const handler = () => { warmUpAudio(); };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = "global-chat-sound";

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedback_message",
        },
        (payload) => {
          const row = payload.new as {
            senderType?: string;
            visibility?: string;
          };

          // Only play for messages from external users (customers)
          if (row.senderType !== "user") return;
          // Only for public messages
          if (row.visibility && row.visibility !== "public") return;

          const now = Date.now();
          if (now - lastPlayRef.current < 2000) return;
          lastPlayRef.current = now;

          playSound();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
