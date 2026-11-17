import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Strikethrough, Code, List, ListOrdered } from "lucide-react";
import { MAX_NOTE_LENGTH } from "@/lib/storage";

export interface EditingNote {
  id: number;
  title: string;
  draft: string;
  confirmDiscard: boolean;
}

export default function NoteModal({
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
  const mouseDownOnBackdrop = useRef(false);
  const resizing = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onTextareaMouseDown = useCallback(() => {
    resizing.current = true;
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      if (resizing.current) {
        requestAnimationFrame(() => {
          resizing.current = false;
        });
      }
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  const guardedClick = (fn: () => void) => () => {
    if (!resizing.current) fn();
  };

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

  const tryDismiss = () => {
    if (hasChanges) {
      setEditingNote({ ...editingNote, confirmDiscard: true });
    } else {
      setEditingNote(null);
    }
  };
  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-scrim"
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget && !resizing.current) {
          tryDismiss();
        }
        mouseDownOnBackdrop.current = false;
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit note for ${editingNote.title}`}
    >
      <div
        className="dialog mx-4 w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {editingNote.confirmDiscard ? (
          <>
            <h2 className="mb-2 text-xl">Unsaved changes</h2>
            <p className="mb-4 text-md text-ink-2">
              Your note for <span className="font-medium text-ink">{editingNote.title}</span> has
              been modified but not saved. Would you like to go back and save
              your changes, or discard them?
            </p>
            <div className="mb-6 border-t border-rule-2 bg-sheet-2 p-3 text-sm">
              <p className="mb-1 text-sm font-medium text-muted">Your unsaved note:</p>
              <p className="whitespace-pre-wrap break-words text-ink-2">
                {editingNote.draft || <span className="italic text-muted">(empty)</span>}
              </p>
            </div>
            <div className="flex justify-end gap-2">
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
          </>
        ) : (
          <>
            <h2 className="mb-1 text-xl">{editingNote.title}</h2>
            <p className="mb-4 text-md text-ink-2">Add your notes below</p>
            <div className="mb-2 flex items-center gap-1">
              {formatActions.map(({ icon: Icon, prefix, suffix, title, key }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => wrapSelection(prefix, suffix)}
                  title={`${title} (${navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+${key.toUpperCase()})`}
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
              autoFocus
              rows={14}
              value={editingNote.draft}
              onChange={(e) =>
                setEditingNote({ ...editingNote, draft: e.target.value })
              }
              onMouseDown={onTextareaMouseDown}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  updateNote(editingNote.id, editingNote.draft);
                  setEditingNote(null);
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
            <div className="mt-2 flex items-center justify-between">
              <span className={`font-outlier text-xs tabular-nums ${editingNote.draft.length >= MAX_NOTE_LENGTH ? "text-error" : "text-muted"}`}>
                {editingNote.draft.length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()} characters
              </span>
              {hasChanges ? (
                <span className="font-display text-sm font-medium text-accent">
                  Unsaved changes, {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
                </span>
              ) : (
                <span className="font-display text-sm text-muted">
                  {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
                </span>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={guardedClick(tryDismiss)}
                className="btn"
              >
                Cancel
              </button>
              <button
                onClick={guardedClick(() => {
                  updateNote(editingNote.id, editingNote.draft);
                  setEditingNote(null);
                })}
                type="button"
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
