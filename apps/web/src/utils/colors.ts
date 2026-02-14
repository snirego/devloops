/**
 * Centralized color class tokens for the feedback-system UI.
 *
 * These map semantic purposes to Tailwind classes that look good in BOTH
 * light and dark modes.  Every new view / component should import from
 * here instead of hard-coding `text-light-XXX dark:text-dark-XXX`.
 *
 * ── Quick reference of the custom grey scale ──
 *
 * LIGHT mode (higher number = darker):
 *   light-50  hsl(0 0% 98.8%)  ← page bg
 *   light-100 hsl(0 0% 97.3%)  ← hover bg / card bg
 *   light-200 hsl(0 0% 95.3%)  ← border / divider
 *   light-300 hsl(0 0% 92.9%)  ← heavier border
 *   light-700 hsl(0 0% 78%)    ← faint icon
 *   light-800 hsl(0 0% 56.1%)  ← secondary text (readable!)
 *   light-900 hsl(0 0% 52.2%)  ← body text
 *   light-950 hsl(0 0% 43.5%)  ← strong body text
 *   light-1000 hsl(0 0% 9%)    ← heading / primary text
 *
 * DARK mode (higher number = lighter):
 *   dark-50  #161616            ← page bg
 *   dark-100 #1c1c1c            ← card bg
 *   dark-200 #232323            ← border / divider
 *   dark-300 #282828            ← heavier border
 *   dark-700 #505050            ← faint icon
 *   dark-800 #707070            ← secondary text (readable!)
 *   dark-900 #7e7e7e            ← body text
 *   dark-950 #bbb              ← strong body text
 *   dark-1000 #ededed           ← heading / primary text
 *
 * ────────────────────────────────────────────────────────
 * RULE OF THUMB — never use values 400-600 for text/icons
 * (they're background / border shades in both scales).
 * ────────────────────────────────────────────────────────
 */

// ─── Text colors ──────────────────────────────────────────────────────────────

/** Page headings, modal titles, card titles — highest contrast */
export const TEXT_PRIMARY = "text-light-1000 dark:text-dark-1000";

/** Body text, descriptions, form values — default readable text */
export const TEXT_BODY = "text-light-950 dark:text-dark-950";

/** Secondary text: timestamps, counters, metadata, helper copy */
export const TEXT_SECONDARY = "text-light-900 dark:text-dark-900";

/** Tertiary text: subtle hints, tiny captions, least important info */
export const TEXT_TERTIARY = "text-light-800 dark:text-dark-800";

/** Placeholder text inside inputs */
export const TEXT_PLACEHOLDER = "placeholder-light-800 dark:placeholder-dark-800";

// ─── Icon colors ──────────────────────────────────────────────────────────────

/** Default icon color — visible but not distracting */
export const ICON_DEFAULT = "text-light-900 dark:text-dark-900";

/** Muted / decorative icon (e.g. empty-state illustrations) */
export const ICON_MUTED = "text-light-800 dark:text-dark-800";

// ─── Background colors ───────────────────────────────────────────────────────

/** Page / panel background */
export const BG_PAGE = "bg-light-50 dark:bg-dark-50";

/** Card / surface background */
export const BG_SURFACE = "bg-white dark:bg-dark-100";

/** Hover background for interactive rows, list items, buttons */
export const BG_HOVER = "hover:bg-light-100 dark:hover:bg-dark-200";

// ─── Border colors ────────────────────────────────────────────────────────────

/** Light border for cards, popovers, modals */
export const BORDER_DEFAULT = "border-light-200 dark:border-dark-300";

/** Heavier border for section dividers, panel separators */
export const BORDER_STRONG = "border-light-300 dark:border-dark-300";

// ─── Section headers (uppercase labels, drawer sections) ─────────────────────

/** Small uppercase section heading (e.g. "DESCRIPTION", "CONFIDENCE") */
export const TEXT_SECTION_HEADING = "text-light-900 dark:text-dark-900";

/** Label inside a Tag / pill / key-value pair */
export const TEXT_TAG_LABEL = "text-light-900 dark:text-dark-900";

/** Value inside a Tag / pill / key-value pair — slightly bolder */
export const TEXT_TAG_VALUE = "text-light-950 dark:text-dark-950";

// ─── Buttons ──────────────────────────────────────────────────────────────────

/** Secondary/ghost button text color */
export const BTN_SECONDARY_TEXT = "text-light-950 dark:text-dark-950";

/** Secondary/ghost button — full class set (border + hover) */
export const BTN_SECONDARY = `${BORDER_DEFAULT} ${BTN_SECONDARY_TEXT} ${BG_HOVER}`;

// ─── Inline editable fields (click-to-edit) ──────────────────────────────────

/** Placeholder shown in click-to-edit empty fields */
export const EDITABLE_PLACEHOLDER = "text-light-800 dark:text-dark-800";

/** The edit pencil icon that appears on hover */
export const EDITABLE_ICON = "text-light-800 dark:text-dark-800";
