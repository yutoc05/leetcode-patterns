import { forwardRef } from "react";
import { flexRender, type Row } from "@tanstack/react-table";
import { Question } from "@/types/question";
import { doneRowTint } from "./difficultyStyles";

interface QuestionRowProps {
  row: Row<Question>;
  completed: Set<number>;
  toggleCompleted: (id: number) => void;
  toggleStarred: (id: number) => void;
  dataIndex: number;
}

const QuestionRow = forwardRef<HTMLTableRowElement, QuestionRowProps>(
  function QuestionRow({ row, completed, toggleCompleted, toggleStarred, dataIndex }, ref) {
    const isDone = completed.has(row.original.id);
    return (
      <tr
        key={row.id}
        data-index={dataIndex}
        ref={ref}
        className={`border-t border-rule transition-colors duration-(--dur-micro) ${
          isDone ? `text-muted ${doneRowTint[row.original.difficulty] ?? ""}` : "text-ink-2 hover:bg-wash"
        }`}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as { clickable?: boolean; toggleFn?: string; noStrikethrough?: boolean } | undefined;
          const isClickable = meta?.clickable;
          const onClick = isClickable
            ? () => (meta?.toggleFn === "starred" ? toggleStarred : toggleCompleted)(row.original.id)
            : undefined;
          const strikethrough = isDone && !meta?.noStrikethrough ? "line-through decoration-rule-2/40" : "";
          return (
            <td
              key={cell.id}
              className={`px-2 py-2 align-middle ${strikethrough} ${isClickable ? "cursor-pointer select-none" : ""}`}
              onClick={onClick}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          );
        })}
      </tr>
    );
  }
);

export default QuestionRow;
