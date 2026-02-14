import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";

import Button from "~/components/Button";
import { api } from "~/utils/api";
import {
  DEFAULT_BRAND_COLOR,
  generateBrandPalette,
  getContrastText,
} from "~/utils/brandColors";

const PRESET_COLORS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Orange", hex: "#f97316" },
  { name: "Red", hex: "#ef4444" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Slate", hex: "#64748b" },
];

export default function UpdateBrandColorForm({
  workspacePublicId,
  currentBrandColor,
  disabled = false,
}: {
  workspacePublicId: string;
  currentBrandColor: string | null | undefined;
  disabled?: boolean;
}) {
  const utils = api.useUtils();
  const [color, setColor] = useState(
    currentBrandColor ?? DEFAULT_BRAND_COLOR,
  );
  const [inputValue, setInputValue] = useState(
    currentBrandColor ?? DEFAULT_BRAND_COLOR,
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = currentBrandColor ?? DEFAULT_BRAND_COLOR;
    setColor(c);
    setInputValue(c);
  }, [currentBrandColor]);

  const updateWorkspace = api.workspace.update.useMutation({
    onSuccess: () => {
      if (workspacePublicId && workspacePublicId.length >= 12) {
        void utils.workspace.byId.invalidate({ workspacePublicId });
        void utils.workspace.all.invalidate();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const isValidHex = (val: string) => /^#[0-9a-fA-F]{6}$/.test(val);

  const handleColorInput = (val: string) => {
    setInputValue(val);
    // Auto-prefix # if user types raw hex
    let normalized = val.trim();
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
      normalized = `#${normalized}`;
    }
    if (isValidHex(normalized)) {
      setColor(normalized);
      setInputValue(normalized);
    }
  };

  const handlePresetClick = (hex: string) => {
    setColor(hex);
    setInputValue(hex);
  };

  const handleSave = () => {
    if (disabled || !isValidHex(color)) return;
    updateWorkspace.mutate({
      workspacePublicId,
      brandColor: color,
    });
  };

  const handleReset = () => {
    setColor(DEFAULT_BRAND_COLOR);
    setInputValue(DEFAULT_BRAND_COLOR);
  };

  const palette = generateBrandPalette(color);
  const hasChanged = color !== (currentBrandColor ?? DEFAULT_BRAND_COLOR);

  return (
    <div className="mb-8">
      <p className="mb-4 text-sm text-neutral-500 dark:text-dark-900">
        {t`Choose a brand color that will be applied throughout the entire application, including the chat widget. This color defines your workspace identity.`}
      </p>

      {/* Current color preview + hex input */}
      <div className="mb-4 flex items-center gap-3">
        <label className="relative">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setInputValue(e.target.value);
            }}
            disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-light-300 shadow-sm transition-shadow hover:shadow-md dark:border-dark-400"
            style={{ backgroundColor: color }}
          >
            <span
              style={{ color: getContrastText(color), fontSize: 11, fontWeight: 700 }}
            >
              Aa
            </span>
          </div>
        </label>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleColorInput(e.target.value)}
          placeholder="#6366f1"
          disabled={disabled}
          maxLength={7}
          className="w-28 rounded-lg border border-light-300 bg-light-50 px-3 py-2 font-mono text-sm text-light-1000 outline-none transition-colors focus:border-light-500 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:focus:border-dark-600"
        />

        {color !== DEFAULT_BRAND_COLOR && (
          <button
            onClick={handleReset}
            disabled={disabled}
            className="text-xs text-light-800 underline decoration-dotted hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000"
          >
            {t`Reset to default`}
          </button>
        )}
      </div>

      {/* Preset swatches */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-light-900 dark:text-dark-900">
          {t`Presets`}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.hex}
              onClick={() => handlePresetClick(preset.hex)}
              disabled={disabled}
              title={preset.name}
              className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${
                color.toLowerCase() === preset.hex.toLowerCase()
                  ? "border-light-1000 ring-2 ring-light-400 dark:border-dark-1000 dark:ring-dark-600"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: preset.hex }}
            />
          ))}
        </div>
      </div>

      {/* Palette preview */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-light-900 dark:text-dark-900">
          {t`Generated palette`}
        </p>
        <div className="flex overflow-hidden rounded-lg border border-light-200 dark:border-dark-400">
          {Object.entries(palette).map(([weight, hex]) => (
            <div
              key={weight}
              className="flex flex-1 flex-col items-center justify-end py-1"
              style={{ backgroundColor: hex, minHeight: 48 }}
            >
              <span
                className="text-[9px] font-medium"
                style={{ color: getContrastText(hex) }}
              >
                {weight}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live preview bar */}
      <div className="mb-5 overflow-hidden rounded-lg border border-light-200 dark:border-dark-400">
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ backgroundColor: palette[600] }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "#fff",
            }}
          >
            D
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {t`Widget preview`}
            </div>
            <div className="text-[10px] text-white/70">
              {t`This is how the chat header will look`}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 bg-white p-3 dark:bg-dark-50">
          <div className="flex justify-end">
            <div
              className="max-w-[70%] rounded-xl px-3 py-2 text-xs"
              style={{
                backgroundColor: palette[500],
                color: "#fff",
              }}
            >
              {t`Hello! How can I help?`}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-800 dark:bg-dark-200 dark:text-dark-1000">
              {t`I have a question about my order.`}
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={disabled || !hasChanged || !isValidHex(color) || updateWorkspace.isPending}
          size="sm"
        >
          {updateWorkspace.isPending
            ? t`Saving...`
            : saved
              ? t`Saved!`
              : t`Save brand color`}
        </Button>
        {!isValidHex(inputValue) && inputValue.length > 0 && (
          <span className="text-xs text-red-500">
            {t`Enter a valid hex color (e.g. #6366f1)`}
          </span>
        )}
      </div>
    </div>
  );
}
