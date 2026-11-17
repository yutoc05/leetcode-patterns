import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import FilterToolbar from "@/components/questions/FilterToolbar";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockColumn = (filterValue: unknown = undefined) => ({
  getFilterValue: () => filterValue,
  setFilterValue: vi.fn(),
});

const mockTable = {
  getColumn: (id: string) => {
    if (id === "difficulty" || id === "pattern" || id === "company") return mockColumn();
    return undefined;
  },
} as never;

function renderToolbar(globalFilter = "") {
  const setGlobalFilter = vi.fn();
  const result = render(
    <FilterToolbar
      table={mockTable}
      globalFilter={globalFilter}
      setGlobalFilter={setGlobalFilter}
      patterns={[]}
      companies={[]}
      showStarredOnly={false}
      setShowStarredOnly={vi.fn()}
      hideCompleted={false}
      setHideCompleted={vi.fn()}
      hidePatterns={false}
      setHidePatterns={vi.fn()}
      showDueOnly={false}
      setShowDueOnly={vi.fn()}
      pickRandom={vi.fn()}
      shuffleOrder={null}
      toggleShuffle={vi.fn()}
      exportProgress={vi.fn()}
      fileInputRef={createRef()}
      importProgress={vi.fn()}
      starred={new Set()}
      notes={{}}
      completed={new Set()}
      reminders={{}}
      setClearConfirm={vi.fn()}
      searchRef={createRef()}
      columnFilters={[]}
    />,
  );
  return { ...result, setGlobalFilter };
}

describe("FilterToolbar", () => {
  it("renders the search box with its keyboard hint", () => {
    renderToolbar();
    expect(screen.getByLabelText("Search questions")).toBeInTheDocument();
    expect(screen.getByText("/")).toBeInTheDocument();
  });

  it("passes typed text to setGlobalFilter", () => {
    const { setGlobalFilter } = renderToolbar();
    fireEvent.change(screen.getByLabelText("Search questions"), { target: { value: "two sum" } });
    expect(setGlobalFilter).toHaveBeenCalledWith("two sum");
  });

  it("shows the filter dropdowns and view toggles", () => {
    renderToolbar();
    expect(screen.getByText("All Difficulties")).toBeInTheDocument();
    expect(screen.getByText("All Patterns")).toBeInTheDocument();
    expect(screen.getByText("All Companies")).toBeInTheDocument();
    expect(screen.getByLabelText("Hide completed")).toBeInTheDocument();
  });
});
