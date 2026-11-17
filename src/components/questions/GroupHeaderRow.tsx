import { forwardRef } from "react";
import { ChevronRight, ChevronDown, RotateCcw } from "lucide-react";

const difficultyColor: Record<string, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

interface GroupHeaderRowProps {
  groupKey: string;
  groupDone: number;
  total: number;
  isCollapsed: boolean;
  toggleGroup: (group: string) => void;
  setResetConfirmGroup: (group: string) => void;
  colSpan: number;
  dataIndex: number;
}

const GroupHeaderRow = forwardRef<HTMLTableRowElement, GroupHeaderRowProps>(
  function GroupHeaderRow({ groupKey, groupDone, total, isCollapsed, toggleGroup, setResetConfirmGroup, colSpan, dataIndex }, ref) {
    return (
      <tr
        key={`header-${groupKey}`}
        data-index={dataIndex}
        ref={ref}
        className="cursor-pointer select-none border-t-2 border-rule-2 bg-sheet-2 transition-colors duration-(--dur-micro) hover:bg-sheet-3 focus-visible:-outline-offset-2"
        onClick={() => toggleGroup(groupKey)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(groupKey); } }}
        tabIndex={0}
        role="button"
        aria-expanded={!isCollapsed}
        aria-label={`${groupKey} group, ${groupDone} of ${total} completed`}
      >
        <td
          colSpan={colSpan}
          className="px-2 py-2"
        >
          <span className="flex items-center gap-3">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            )}
            <span className={`font-display text-xl font-semibold tracking-[-0.02em] ${difficultyColor[groupKey] ?? ""}`}>
              {groupKey}
            </span>
            <span className="text-sm text-muted tabular-nums">
              {groupDone}/{total} completed
            </span>
            {groupDone > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setResetConfirmGroup(groupKey);
                }}
                className="btn btn-quiet ml-auto text-muted hover:text-error"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </span>
        </td>
      </tr>
    );
  }
);

export default GroupHeaderRow;
