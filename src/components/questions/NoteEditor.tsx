import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Strikethrough, Code, List, ListOrdered } from "lucide-react";
import { MAX_NOTE_LENGTH } from "@/lib/storage";

export interface EditingNote {
  id: number;
  title: string;
  draft: string;
  confirmDiscard: boolean;
}

/**
 * Inline note editor. It opens in the space under its question rather than
 * over the page, so several can be open at once while the list stays readable
 * and scrollable. setEditingNote(next) updates this editor's draft,
 * setEditingNote(null) closes it, and updateNote(id, value) saves.
 */
export default function NoteEditor({
  editingNote,
  setEditingNote,
  updateNote,
  notes,
}: {
  editingNote: EditingNote;
  setEditingNote: (note: EditingNote | null) => void;
  updateNote: (id: number, value: string) => void;
  notes: Record<number, string>;
}) {
  const saved = notes[editingNote.id] ?? "";
  const hasChanges = editingNote.draft !== saved;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modKey = typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘" : "Ctrl";

  // Take focus when opened from its note button, but not when the editor
  // remounts while the user is busy elsewhere (e.g. typing in the search box
  // makes this row leave and re-enter the list).
  useEffect(() => {
    const active = document.activeElement;
    const ta = textareaRef.current;
    if (ta && (!active || active === document.body || active.closest("[data-note-toggle]"))) {
      ta.focus();
      // Continue an existing note from its end rather than its first character.
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, []);

  const wrapSelection = useCallback(
    (prefix: string, suffix: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = editingNote.draft;
      const selected = text.slice(start, end);
      const wrapped = prefix + selected + suffix;
      const updated = text.slice(0, start) + wrapped + text.slice(end);
      setEditingNote({ ...editingNote, draft: updated });
      requestAnimationFrame(() => {
        ta.focus();
        if (selected.length > 0) {
          ta.setSelectionRange(start, start + wrapped.length);
        } else {
          const cursor = start + prefix.length;
          ta.setSelectionRange(cursor, cursor);
        }
      });
    },
    [editingNote, setEditingNote],
  );

  const prefixLines = useCallback(
    (mode: "bullet" | "numbered") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const text = editingNote.draft;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = text.indexOf("\n", end);
      const block = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const lines = block.split("\n");
      const prefixed = lines
        .map((l, i) => (mode === "bullet" ? `- ${l}` : `${i + 1}. ${l}`))
        .join("\n");
      const updated = text.slice(0, lineStart) + prefixed + (lineEnd === -1 ? "" : text.slice(lineEnd));
      setEditingNote({ ...editingNote, draft: updated });
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(lineStart, lineStart + prefixed.length);
      });
    },
    [editingNote, setEditingNote],
  );

  const formatActions = [
    { icon: Bold, prefix: "**", suffix: "**", title: "Bold", key: "b" },
    { icon: Italic, prefix: "*", suffix: "*", title: "Italic", key: "i" },
    { icon: Strikethrough, prefix: "~~", suffix: "~~", title: "Strikethrough", key: "s" },
    { icon: Code, prefix: "`", suffix: "`", title: "Code", key: "e" },
  ];

  const listActions = [
    { icon: List, mode: "bullet" as const, title: "Bullet list" },
    { icon: ListOrdered, mode: "numbered" as const, title: "Numbered list" },
  ];

  const save = () => {
    updateNote(editingNote.id, editingNote.draft);
    setEditingNote(null);
  };

  const tryDismiss = () => {
    if (hasChanges) {
      setEditingNote({ ...editingNote, confirmDiscard: true });
    } else {
      setEditingNote(null);
    }
  };

  return (
    <div
      role="group"
      aria-label={`Edit note for ${editingNote.title}`}
      className="max-w-3xl"
    >
      <div className="mb-2 flex items-center gap-1">
        {formatActions.map(({ icon: Icon, prefix, suffix, title, key }) => (
          <button
            key={title}
            type="button"
            onClick={() => wrapSelection(prefix, suffix)}
            title={`${title} (${modKey}+${key.toUpperCase()})`}
            className="btn btn-quiet btn-icon text-muted hover:text-ink"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-rule" aria-hidden="true" />
        {listActions.map(({ icon: Icon, mode, title }) => (
          <button
            key={title}
            type="button"
            onClick={() => prefixLines(mode)}
            title={title}
            className="btn btn-quiet btn-icon text-muted hover:text-ink"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        rows={6}
        value={editingNote.draft}
        onChange={(e) =>
          setEditingNote({ ...editingNote, draft: e.target.value })
        }
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            // Handled here so Escape only affects the note being typed in.
            e.preventDefault();
            e.stopPropagation();
            if (editingNote.confirmDiscard) {
              setEditingNote({ ...editingNote, confirmDiscard: false });
            } else {
              tryDismiss();
            }
            return;
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
            return;
          }
          if (e.metaKey || e.ctrlKey) {
            const action = formatActions.find((a) => a.key === e.key);
            if (action) {
              e.preventDefault();
              wrapSelection(action.prefix, action.suffix);
            }
          }
        }}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Write your notes here..."
        aria-label={`Note for ${editingNote.title}`}
        className="field w-full resize-y break-words"
      />
      {editingNote.confirmDiscard ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-rule-2 pt-3">
          <p className="text-sm text-ink-2">
            <span className="font-display font-medium text-ink">Unsaved changes</span>
            {" "}will be lost if you close this note.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setEditingNote({ ...editingNote, confirmDiscard: false })
              }
              className="btn"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => setEditingNote(null)}
              className="btn btn-danger"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className={`font-outlier text-xs tabular-nums ${editingNote.draft.length >= MAX_NOTE_LENGTH ? "text-error" : "text-muted"}`}>
            {editingNote.draft.length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()} characters
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {hasChanges ? (
              <span className="font-display text-sm font-medium text-accent">
                Unsaved changes, {modKey}+Enter to save
              </span>
            ) : (
              <span className="font-display text-sm text-muted">
                {modKey}+Enter to save
              </span>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={tryDismiss}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
