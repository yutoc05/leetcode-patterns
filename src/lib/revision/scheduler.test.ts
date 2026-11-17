import { describe, it, expect } from "vitest";
import { rate, previewIntervals, stabilityOf } from "./scheduler";
import type { Reminder } from "@/lib/reminders";

const NOW = new Date("2026-03-10T12:00:00Z");
const DAY = 86_400_000;

function after(days: number) {
  return new Date(NOW.getTime() + days * DAY);
}

describe("revision scheduler (FSRS)", () => {
  it("schedules a first review a few days out and records FSRS state", () => {
    const r = rate(undefined, "good", NOW);
    expect(r.nextReview > "2026-03-10").toBe(true);
    expect(r.interval).toBeGreaterThan(0);
    expect(r.fsrs?.reps).toBe(1);
    expect(r.fsrs?.last_review).toBe(NOW.toISOString());
  });

  it("orders intervals Hard < Good < Easy, for new and reviewed questions", () => {
    const fresh = previewIntervals(undefined, NOW);
    expect(fresh.hard).toBeLessThan(fresh.good);
    expect(fresh.good).toBeLessThan(fresh.easy);

    const reviewed = rate(undefined, "good", NOW);
    const later = previewIntervals(reviewed, new Date(reviewed.fsrs!.due));
    expect(later.hard).toBeLessThan(later.good);
    expect(later.good).toBeLessThan(later.easy);
  });

  it("previews exactly what rating would schedule", () => {
    const preview = previewIntervals(undefined, NOW);
    expect(rate(undefined, "hard", NOW).interval).toBe(preview.hard);
    expect(rate(undefined, "good", NOW).interval).toBe(preview.good);
    expect(rate(undefined, "easy", NOW).interval).toBe(preview.easy);
  });

  it("pushes each successful review further out", () => {
    let reminder: Reminder | undefined;
    let now = NOW;
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      reminder = rate(reminder, "good", now);
      intervals.push(reminder.interval);
      now = new Date(reminder.fsrs!.due);
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
  });

  it("keeps growing (more slowly) when every review is Hard", () => {
    let reminder: Reminder | undefined;
    let now = NOW;
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      reminder = rate(reminder, "hard", now);
      intervals.push(reminder.interval);
      now = new Date(reminder.fsrs!.due);
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
  });

  it("treats a reminder made before FSRS as a new question", () => {
    const legacy: Reminder = { nextReview: "2026-03-09", interval: 7 };
    expect(rate(legacy, "good", NOW)).toEqual(rate(undefined, "good", NOW));
  });

  it("caps intervals at about a year", () => {
    let reminder: Reminder | undefined;
    let now = NOW;
    for (let i = 0; i < 12; i++) {
      reminder = rate(reminder, "easy", now);
      now = new Date(reminder.fsrs!.due);
    }
    // ts-fsrs keeps Easy at least a day past Good, so the cap can land on 365 to 367.
    expect(reminder!.interval).toBeLessThanOrEqual(367);
  });

  it("survives a JSON round trip (localStorage and sync)", () => {
    const first = rate(undefined, "good", NOW);
    const restored = JSON.parse(JSON.stringify(first)) as Reminder;
    expect(rate(restored, "good", after(first.interval))).toEqual(rate(first, "good", after(first.interval)));
  });

  it("reports stability only for questions rated with FSRS", () => {
    expect(stabilityOf(undefined)).toBe(0);
    expect(stabilityOf({ nextReview: "2026-03-09", interval: 1 })).toBe(0);
    expect(stabilityOf(rate(undefined, "good", NOW))).toBeGreaterThan(0);
  });
});
