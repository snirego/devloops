import { t } from "@lingui/core/macro";
import { useState, useRef, useCallback } from "react";
import { HiXMark } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  suggestions?: string[];
  className?: string;
}

export default function TagInput({
  tags,
  onChange,
  placeholder,
  disabled = false,
  maxTags = 50,
  suggestions = [],
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.map((t) => t.toLowerCase()).includes(s.toLowerCase()),
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (
        !trimmed ||
        tags.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase()) ||
        tags.length >= maxTags
      ) {
        return;
      }
      onChange([...tags, trimmed]);
      setInputValue("");
      setShowSuggestions(false);
    },
    [tags, onChange, maxTags],
  );

  const removeTag = useCallback(
    (index: number) => {
      const next = tags.filter((_, i) => i !== index);
      onChange(next);
    },
    [tags, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      tags.length > 0
    ) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className={twMerge("relative", className)}>
      <div
        className={twMerge(
          "flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border-0 bg-white/5 px-2 py-1.5 ring-1 ring-inset ring-light-600 transition-colors focus-within:ring-2 focus-within:ring-light-700 dark:bg-dark-300 dark:ring-dark-500 dark:focus-within:ring-dark-600",
          disabled && "opacity-50",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 ring-1 ring-inset ring-brand-500/20 dark:text-brand-400"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(i);
                }}
                className="ml-0.5 rounded-sm p-0.5 transition-colors hover:bg-brand-500/20"
              >
                <HiXMark className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
            if (inputValue.trim()) addTag(inputValue);
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : t`Add more...`}
          disabled={disabled || tags.length >= maxTags}
          className="min-w-[80px] flex-1 border-0 bg-transparent p-1 text-sm text-light-1000 outline-none placeholder:text-light-700 dark:placeholder:text-dark-700 dark:text-dark-1000"
        />
      </div>

      {showSuggestions &&
        inputValue.length > 0 &&
        filteredSuggestions.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-36 w-full overflow-y-auto rounded-lg border border-light-300 bg-white py-1 shadow-lg dark:border-dark-400 dark:bg-dark-200">
            {filteredSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(suggestion);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-light-1000 transition-colors hover:bg-light-100 dark:text-dark-1000 dark:hover:bg-dark-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
