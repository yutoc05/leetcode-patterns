import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteEditor, { type EditingNote } from "@/components/questions/NoteEditor";

function renderEditor(overrides: Partial<EditingNote> = {}, notesSaved: Record<number, string> = {}) {
  const editingNote: EditingNote = { id: 1, title: "Test Problem", draft: "", confirmDiscard: false, ...overrides };
  const setEditingNote = vi.fn();
  const updateNote = vi.fn();
  render(<NoteEditor editingNote={editingNote} setEditingNote={setEditingNote} updateNote={updateNote} notes={notesSaved} />);
  return { setEditingNote, updateNote, editingNote };
}

describe("NoteEditor", () => {
  describe("Basic rendering", () => {
    it("renders inline, labelled with the problem title, not as a dialog", () => {
      renderEditor();
      expect(screen.getByRole("group", { name: "Edit note for Test Problem" })).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows textarea with draft content", () => {
      renderEditor({ draft: "my draft" });
      const textarea = screen.getByPlaceholderText("Write your notes here...");
      expect(textarea).toHaveValue("my draft");
    });

    it("shows character count", () => {
      renderEditor({ draft: "hello" });
      expect(screen.getByText(/5 \/ 10,000 characters/)).toBeInTheDocument();
    });
  });

  describe("Formatting toolbar", () => {
    it("shows Bold, Italic, Strikethrough, Code buttons", () => {
      renderEditor();
      expect(screen.getByTitle(/bold/i)).toBeInTheDocument();
      expect(screen.getByTitle(/italic/i)).toBeInTheDocument();
      expect(screen.getByTitle(/strikethrough/i)).toBeInTheDocument();
      expect(screen.getByTitle(/code/i)).toBeInTheDocument();
    });

    it("shows Bullet list and Numbered list buttons", () => {
      renderEditor();
      expect(screen.getByTitle("Bullet list")).toBeInTheDocument();
      expect(screen.getByTitle("Numbered list")).toBeInTheDocument();
    });

    it("clicking Bold button inserts ** markers", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor();
      await user.click(screen.getByTitle(/bold/i));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("**") }));
    });

    it("clicking Italic button inserts * markers", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor();
      await user.click(screen.getByTitle(/italic/i));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("*") }));
    });

    it("clicking Strikethrough button inserts ~~ markers", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor();
      await user.click(screen.getByTitle(/strikethrough/i));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("~~") }));
    });

    it("clicking Code button inserts backtick markers", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor();
      await user.click(screen.getByTitle(/code/i));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("`") }));
    });

    it("clicking Bullet list button inserts - prefix", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor();
      await user.click(screen.getByTitle("Bullet list"));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("- ") }));
    });

    it("clicking Numbered list button inserts 1. prefix", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor();
      await user.click(screen.getByTitle("Numbered list"));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("1. ") }));
    });
  });

  describe("Keyboard shortcuts", () => {
    it("Cmd+B triggers bold formatting", () => {
      const { setEditingNote } = renderEditor();
      const textarea = screen.getByPlaceholderText("Write your notes here...");
      fireEvent.keyDown(textarea, { key: "b", metaKey: true });
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("**") }));
    });

    it("Cmd+I triggers italic formatting", () => {
      const { setEditingNote } = renderEditor();
      const textarea = screen.getByPlaceholderText("Write your notes here...");
      fireEvent.keyDown(textarea, { key: "i", metaKey: true });
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.stringContaining("*") }));
    });

    it("Cmd+Enter saves and closes", () => {
      const { setEditingNote, updateNote } = renderEditor({ draft: "saved text" });
      const textarea = screen.getByPlaceholderText("Write your notes here...");
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
      expect(updateNote).toHaveBeenCalledWith(1, "saved text");
      expect(setEditingNote).toHaveBeenCalledWith(null);
    });
  });

  describe("Dismiss behavior", () => {
    it("clicking Cancel when no changes calls setEditingNote(null)", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor({ draft: "" }, {});
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(setEditingNote).toHaveBeenCalledWith(null);
    });

    it("clicking Cancel with unsaved changes shows confirm discard dialog", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor({ draft: "modified" }, { 1: "original" });
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ confirmDiscard: true }));
    });

    it("clicking Done saves and closes", async () => {
      const user = userEvent.setup();
      const { setEditingNote, updateNote } = renderEditor({ draft: "my note" });
      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(updateNote).toHaveBeenCalledWith(1, "my note");
      expect(setEditingNote).toHaveBeenCalledWith(null);
    });
  });

  describe("Confirm discard dialog", () => {
    it("shows Unsaved changes heading when confirmDiscard is true", () => {
      renderEditor({ confirmDiscard: true, draft: "changed" }, { 1: "original" });
      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    });

    it("Keep editing button goes back to editing", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor({ confirmDiscard: true, draft: "changed" }, { 1: "original" });
      await user.click(screen.getByRole("button", { name: "Keep editing" }));
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ confirmDiscard: false }));
    });

    it("Discard button closes the editor", async () => {
      const user = userEvent.setup();
      const { setEditingNote } = renderEditor({ confirmDiscard: true, draft: "changed" }, { 1: "original" });
      await user.click(screen.getByRole("button", { name: "Discard" }));
      expect(setEditingNote).toHaveBeenCalledWith(null);
    });
  });

  describe("Escape key", () => {
    it("closes the editor when there are no changes", () => {
      const { setEditingNote } = renderEditor({ draft: "same" }, { 1: "same" });
      fireEvent.keyDown(screen.getByPlaceholderText("Write your notes here..."), { key: "Escape" });
      expect(setEditingNote).toHaveBeenCalledWith(null);
    });

    it("asks before discarding unsaved changes", () => {
      const { setEditingNote } = renderEditor({ draft: "modified" }, { 1: "original" });
      fireEvent.keyDown(screen.getByPlaceholderText("Write your notes here..."), { key: "Escape" });
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ confirmDiscard: true }));
    });

    it("returns to editing when pressed during the discard prompt", () => {
      const { setEditingNote } = renderEditor({ draft: "modified", confirmDiscard: true }, { 1: "original" });
      fireEvent.keyDown(screen.getByPlaceholderText("Write your notes here..."), { key: "Escape" });
      expect(setEditingNote).toHaveBeenCalledWith(expect.objectContaining({ confirmDiscard: false }));
    });
  });
});
