import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HiOutlineLockClosed,
  HiOutlinePaperAirplane,
  HiOutlineGlobeAlt,
  HiOutlineAtSymbol,
} from "react-icons/hi2";

import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface InternalNoteInputProps {
  onSend: (
    text: string,
    visibility: "public" | "internal",
    mentions?: string[],
  ) => void;
  disabled?: boolean;
}

export default function InternalNoteInput({
  onSend,
  disabled,
}: InternalNoteInputProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"public" | "internal">("public");

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch workspace members for @mention
  const { workspace } = useWorkspace();
  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId && workspace.publicId.length >= 12 },
  );

  const members: Member[] = useMemo(() => {
    if (!workspaceData?.members) return [];
    return workspaceData.members
      .filter((m: any) => m.user && m.deletedAt === null)
      .map((m: any) => ({
        id: m.user.id,
        name: m.user.name ?? m.email ?? "Unknown",
        email: m.user.email ?? m.email ?? "",
      }));
  }, [workspaceData?.members]);

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    if (mentionQuery === "") return members.slice(0, 8);
    const q = mentionQuery.toLowerCase();
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [members, mentionQuery]);

  // Detect @ while typing
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);

      const cursorPos = e.target.selectionStart ?? val.length;

      // Look backwards for an @ that starts a mention
      const before = val.slice(0, cursorPos);
      const atIdx = before.lastIndexOf("@");

      if (atIdx >= 0) {
        const charBeforeAt = atIdx > 0 ? before[atIdx - 1] : " ";
        const afterAt = before.slice(atIdx + 1);
        // Valid mention: @ at start or after whitespace, no spaces in query
        if (
          (charBeforeAt === " " || charBeforeAt === "\n" || atIdx === 0) &&
          !/\s/.test(afterAt)
        ) {
          setMentionQuery(afterAt);
          setMentionStart(atIdx);
          setMentionIdx(0);

          // Auto-switch to internal mode when typing @
          if (mode === "public") {
            setMode("internal");
          }
          return;
        }
      }

      setMentionQuery(null);
      setMentionStart(-1);
    },
    [mode],
  );

  // Insert a mention
  const insertMention = useCallback(
    (member: Member) => {
      const before = text.slice(0, mentionStart);
      const cursorPos = textareaRef.current?.selectionStart ?? text.length;
      const after = text.slice(cursorPos);
      const newText = `${before}@${member.name} ${after}`;
      setText(newText);
      setMentionQuery(null);
      setMentionStart(-1);

      // Focus back and set cursor
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) {
          const pos = before.length + member.name.length + 2; // +2 for @ and space
          ta.focus();
          ta.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [text, mentionStart],
  );

  // Extract mentioned names from text
  const extractMentions = useCallback(
    (val: string): string[] => {
      const mentioned: string[] = [];
      for (const m of members) {
        if (val.includes(`@${m.name}`)) {
          mentioned.push(m.id);
        }
      }
      return mentioned;
    },
    [members],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;

    const trimmed = text.trim();
    const mentions = extractMentions(trimmed);

    // If text contains @ but no tagged member, treat as general internal note
    const hasAtSign = trimmed.includes("@");
    const effectiveVisibility =
      hasAtSign && mentions.length === 0 ? "internal" : mode;

    onSend(trimmed, effectiveVisibility, mentions.length > 0 ? mentions : undefined);
    setText("");
    setMentionQuery(null);

    // Reset mode to public after sending an internal note
    if (effectiveVisibility === "internal") {
      setMode("public");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention dropdown navigation
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => Math.min(i + 1, filteredMembers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIdx]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Close mention dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-light-300 bg-light-50 p-3 dark:border-dark-300 dark:bg-dark-50"
    >
      {/* Mode toggle */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("public")}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-0 ${
            mode === "public"
              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
              : "text-light-800 hover:text-light-900 dark:text-dark-800 dark:hover:text-dark-900"
          }`}
        >
          <HiOutlineGlobeAlt className="h-3 w-3" />
          Reply
        </button>
        <button
          type="button"
          onClick={() => setMode("internal")}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-0 ${
            mode === "internal"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "text-light-800 hover:text-light-900 dark:text-dark-800 dark:hover:text-dark-900"
          }`}
        >
          <HiOutlineLockClosed className="h-3 w-3" />
          Internal Note
        </button>
        <span className="ml-auto text-[10px] text-light-800 dark:text-dark-800">
          <HiOutlineAtSymbol className="mr-0.5 inline h-3 w-3" />
          Type @ to mention a team member
        </span>
      </div>

      {/* Input area */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "internal"
                ? "Write an internal note... Use @ to mention someone"
                : "Type a reply..."
            }
            disabled={disabled}
            rows={1}
            className={`w-full resize-none rounded-lg border px-3 py-2 text-sm text-light-900 placeholder-light-800 focus:outline-none focus:ring-2 dark:text-dark-900 dark:placeholder-dark-800 ${
              mode === "internal"
                ? "border-amber-300 bg-amber-50 focus:ring-amber-400 dark:border-amber-700 dark:bg-amber-950/20"
                : "border-light-300 bg-white focus:ring-brand-400 dark:border-dark-300 dark:bg-dark-100"
            }`}
            style={{ minHeight: "38px", maxHeight: "120px" }}
          />

          {/* @mention dropdown */}
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute bottom-full left-0 z-50 mb-1 w-64 overflow-hidden rounded-lg border border-light-200 bg-white shadow-lg dark:border-dark-300 dark:bg-dark-100"
            >
              {filteredMembers.map((member, i) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(member);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-0 ${
                    i === mentionIdx
                      ? "bg-brand-50 dark:bg-brand-950/30"
                      : "hover:bg-light-100 dark:hover:bg-dark-200"
                  }`}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-500 dark:bg-brand-900 dark:text-brand-300">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-light-900 dark:text-dark-900">
                      {member.name}
                    </div>
                    <div className="truncate text-[10px] text-light-800 dark:text-dark-800">
                      {member.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results hint */}
          {mentionQuery !== null &&
            mentionQuery.length > 0 &&
            filteredMembers.length === 0 && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-light-200 bg-white px-3 py-2 shadow-lg dark:border-dark-300 dark:bg-dark-100">
                <p className="text-xs text-light-800 dark:text-dark-800">
                  No team members matching &quot;{mentionQuery}&quot;
                </p>
              </div>
            )}
        </div>
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-0 disabled:opacity-40 ${
            mode === "internal"
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-brand-500 text-white hover:bg-brand-600"
          }`}
        >
          <HiOutlinePaperAirplane className="h-4 w-4" />
        </button>
      </div>

      {mode === "internal" && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
          <HiOutlineLockClosed className="h-2.5 w-2.5" />
          Only visible to your team
        </p>
      )}
    </form>
  );
}
