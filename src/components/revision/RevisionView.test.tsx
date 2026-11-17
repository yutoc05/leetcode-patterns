import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Question } from "@/types/question";

const { mockTrackEvent } = vi.hoisted(() => ({ mockTrackEvent: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: mockTrackEvent }));

const { mockSearchParams } = vi.hoisted(() => ({ mockSearchParams: { current: new URLSearchParams() } }));
vi.mock("next/navigation", () => ({ useSearchParams: () => mockSearchParams.current }));

vi.mock("@/components/layout/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signIn: vi.fn(), signOut: vi.fn(), syncNow: vi.fn(), syncVersion: 0 }),
}));

import RevisionView from "@/components/revision/RevisionView";
import ViewSwitcher from "@/components/layout/ViewSwitcher";
import QuestionsTable from "@/components/questions/QuestionsTable";

const questions: Question[] = [
  { id: 0, title: "Two Sum", slug: "two-sum", pattern: ["Array", "Hash Table"], difficulty: "Easy", premium: false, companies: [] },
  { id: 1, title: "Linked List Cycle II", slug: "linked-list-cycle-ii", pattern: ["Linked List", "Two Pointers"], difficulty: "Medium", premium: false, companies: [] },
  { id: 2, title: "Climbing Stairs", slug: "climbing-stairs", pattern: ["Dynamic Programming"], difficulty: "Easy", premium: false, companies: [] },
];

const KEYS = {
  completed: "leetcode-patterns-completed",
  notes: "leetcode-patterns-notes",
  solved: "leetcode-patterns-solved-dates",
  reminders: "leetcode-patterns-reminders",
};

/** Two due questions: Linked List Cycle II (due Mar 2, never dated) before Two Sum (due Mar 8). */
function seedDue() {
  localStorage.setItem(KEYS.completed, JSON.stringify([0, 1]));
  localStorage.setItem(KEYS.solved, JSON.stringify({ 0: "2026-03-05T10:00:00.000Z", 1: "2026-03-01T10:00:00.000Z" }));
  localStorage.setItem(KEYS.reminders, JSON.stringify({ 0: { nextReview: "2026-03-08", interval: 3 } }));
}

const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null");
const cardTitle = () => within(screen.getByRole("article")).getByRole("heading", { level: 3 }).textContent;

describe("RevisionView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
    localStorage.clear();
    mockTrackEvent.mockClear();
    mockSearchParams.current = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the most overdue question first, with progress", () => {
    seedDue();
    render(<RevisionView questions={questions} />);
    expect(cardTitle()).toBe("Linked List Cycle II");
    expect(screen.getByText("0 of 2 reviewed")).toBeInTheDocument();
    expect(screen.getByText("Due 8 days ago.", { exact: false })).toBeInTheDocument();
  });

  it("links to LeetCode, and to NeetCode only where it has a solution", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    expect(screen.getByRole("link", { name: /Open on LeetCode/ })).toHaveAttribute("href", "https://leetcode.com/problems/linked-list-cycle-ii/");
    expect(screen.queryByRole("link", { name: /NeetCode solution/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Good/ }));
    expect(cardTitle()).toBe("Two Sum");
    expect(screen.getByRole("link", { name: /NeetCode solution/ })).toHaveAttribute("href", "https://neetcode.io/solutions/two-sum");
  });

  it("hides the pattern until it is revealed", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    expect(screen.queryByText("Two Pointers")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Show pattern/ }));
    expect(screen.getByText("Two Pointers")).toBeInTheDocument();
  });

  it("rating schedules the next review and moves to the next question", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.click(screen.getByRole("button", { name: /Easy/ }));

    const reminder = stored(KEYS.reminders)["1"];
    expect(reminder.nextReview > "2026-03-10").toBe(true);
    expect(reminder.fsrs).toBeDefined();
    expect(stored(KEYS.solved)["1"].slice(0, 10)).toBe("2026-03-10");
    expect(mockTrackEvent).toHaveBeenCalledWith("revision_rate", { question_id: 1, rating: "easy" });
    expect(cardTitle()).toBe("Two Sum");
    expect(screen.getByText("1 of 2 reviewed")).toBeInTheDocument();
  });

  it("shows the interval each rating would set", () => {
    seedDue();
    render(<RevisionView questions={questions} />);
    const buttons = ["Hard", "Good", "Easy"].map((name) => screen.getByRole("button", { name: new RegExp(name) }).textContent!);
    const days = buttons.map((t) => Number(t.match(/next in (\d+) day/)![1]));
    expect(days[0]).toBeLessThan(days[1]);
    expect(days[1]).toBeLessThan(days[2]);
  });

  it("skip moves the question to the back of the queue", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.click(screen.getByRole("button", { name: /Skip for now/ }));
    expect(cardTitle()).toBe("Two Sum");
    await user.click(screen.getByRole("button", { name: /Skip for now/ }));
    expect(cardTitle()).toBe("Linked List Cycle II");
    expect(stored(KEYS.reminders)["1"]).toBeUndefined();
  });

  it("can't skip the last question in the queue", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.click(screen.getByRole("button", { name: /Good/ }));
    expect(screen.getByRole("button", { name: /Skip for now/ })).toBeDisabled();
  });

  it("keyboard: Space reveals, 2 rates Good, S skips", async () => {
    localStorage.setItem(KEYS.completed, JSON.stringify([0, 1, 2]));
    localStorage.setItem(KEYS.solved, JSON.stringify({ 0: "2026-03-01T10:00:00.000Z", 1: "2026-03-02T10:00:00.000Z", 2: "2026-03-03T10:00:00.000Z" }));
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    expect(cardTitle()).toBe("Two Sum");
    await user.keyboard(" ");
    expect(screen.getByText("Hash Table")).toBeInTheDocument();
    await user.keyboard("2");
    expect(stored(KEYS.reminders)["0"]).toBeDefined();
    expect(cardTitle()).toBe("Linked List Cycle II");
    await user.keyboard("s");
    expect(cardTitle()).toBe("Climbing Stairs");
  });

  it("notes written here are saved and show up in All Questions", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.click(screen.getByRole("button", { name: /Add notes/ }));
    await user.type(screen.getByPlaceholderText("Write your notes here..."), "Floyd's tortoise and hare");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(stored(KEYS.notes)["1"]).toBe("Floyd's tortoise and hare");
    expect(screen.getByText("Floyd's tortoise and hare")).toBeInTheDocument();

    cleanup();
    render(<QuestionsTable data={questions} updatedDate="2026-03-01" />);
    expect(screen.getByRole("button", { name: /Edit note for Linked List Cycle II/ })).toBeInTheDocument();
  });

  it("hides a saved note until it is revealed", async () => {
    seedDue();
    localStorage.setItem(KEYS.notes, JSON.stringify({ 1: "Floyd's tortoise and hare" }));
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    expect(screen.queryByText("Floyd's tortoise and hare")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Show notes/ }));
    expect(screen.getByText("Floyd's tortoise and hare")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit notes/ })).toBeInTheDocument();
  });

  it("N shows a hidden note, then opens the editor", async () => {
    seedDue();
    localStorage.setItem(KEYS.notes, JSON.stringify({ 1: "Floyd's tortoise and hare" }));
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.keyboard("n");
    expect(screen.getByText("Floyd's tortoise and hare")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Write your notes here...")).not.toBeInTheDocument();
    await user.keyboard("n");
    expect(screen.getByPlaceholderText("Write your notes here...")).toHaveValue("Floyd's tortoise and hare");
  });

  it("hides notes again on the next question", async () => {
    seedDue();
    localStorage.setItem(KEYS.notes, JSON.stringify({ 0: "hash map of complements", 1: "Floyd's tortoise and hare" }));
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.click(screen.getByRole("button", { name: /Show notes/ }));
    await user.click(screen.getByRole("button", { name: /Good/ }));
    expect(cardTitle()).toBe("Two Sum");
    expect(screen.queryByText("hash map of complements")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show notes/ })).toBeInTheDocument();
  });

  it("rating keeps an unsaved note draft", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.click(screen.getByRole("button", { name: /Add notes/ }));
    await user.type(screen.getByPlaceholderText("Write your notes here..."), "draft");
    await user.click(screen.getByRole("button", { name: /Hard/ }));
    expect(stored(KEYS.notes)["1"]).toBe("draft");
  });

  it("shows the dog once every question is reviewed", async () => {
    seedDue();
    const user = userEvent.setup();
    render(<RevisionView questions={questions} />);
    await user.click(screen.getByRole("button", { name: /Good/ }));
    await user.click(screen.getByRole("button", { name: /Good/ }));
    expect(screen.getByRole("heading", { name: "All caught up!" })).toBeInTheDocument();
    expect(screen.getByText(/You reviewed 2 questions\./)).toBeInTheDocument();
    expect(screen.getByText(/Next review in \d+ days/)).toBeInTheDocument();
    expect(document.querySelector(".dog-frame-a")).toBeInTheDocument();
  });

  it("says nothing is due when solved questions aren't due yet", () => {
    localStorage.setItem(KEYS.completed, JSON.stringify([0]));
    localStorage.setItem(KEYS.reminders, JSON.stringify({ 0: { nextReview: "2026-03-12", interval: 3 } }));
    render(<RevisionView questions={questions} />);
    expect(screen.getByRole("heading", { name: "All caught up!" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing is due today\. Next review in 2 days, on Mar 12\./)).toBeInTheDocument();
  });

  it("explains what to do before anything is solved", () => {
    render(<RevisionView questions={questions} />);
    expect(screen.getByRole("heading", { name: "Nothing to revise yet" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "All caught up!" })).not.toBeInTheDocument();
  });
});

describe("Revision tab", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
    localStorage.clear();
    mockTrackEvent.mockClear();
    mockSearchParams.current = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows how many questions are due", () => {
    seedDue();
    render(<ViewSwitcher questions={questions} updatedDate="2026-03-01" />);
    expect(screen.getByRole("button", { name: "Revision, 2 due" })).toBeInTheDocument();
  });

  it("opens the revision view and puts it in the URL", async () => {
    seedDue();
    const replaceState = vi.spyOn(window.history, "replaceState");
    const user = userEvent.setup();
    render(<ViewSwitcher questions={questions} updatedDate="2026-03-01" />);
    await user.click(screen.getByRole("button", { name: /Revision/ }));
    expect(await screen.findByRole("heading", { name: "Revision" })).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "?view=revision");
    expect(mockTrackEvent).toHaveBeenCalledWith("switch_view", { view: "revision" });
  });

  it("deep links via ?view=revision", () => {
    seedDue();
    mockSearchParams.current = new URLSearchParams("view=revision");
    render(<ViewSwitcher questions={questions} updatedDate="2026-03-01" />);
    expect(screen.getByRole("heading", { name: "Revision" })).toBeInTheDocument();
  });

  it("updates the due count as questions are reviewed", async () => {
    seedDue();
    mockSearchParams.current = new URLSearchParams("view=revision");
    const user = userEvent.setup();
    render(<ViewSwitcher questions={questions} updatedDate="2026-03-01" />);
    await user.click(screen.getByRole("button", { name: /Good/ }));
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Revision, 1 due" })).toBeInTheDocument();
  });
});
