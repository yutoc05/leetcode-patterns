import { describe, it, expect, vi } from "vitest";
import { trackEvent } from "@/lib/analytics";

describe("trackEvent", () => {
  it("is a silent no-op while analytics is disabled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => trackEvent("test_event", { key: "value", count: 1, on: true })).not.toThrow();
    expect(() => trackEvent("bare_event")).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
