"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  className?: string;
  render: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRow,
  emptyTitle,
  emptyBody,
  onEmptyAction,
  emptyActionLabel = "Clear filters",
  pageSize = 6,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRow?: (row: T) => void;
  emptyTitle: string;
  emptyBody: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const signature = rows.map(getRowId).join("|");

  useEffect(() => {
    setPage(1);
  }, [signature]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const visible = rows.slice(start, start + size);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        action={onEmptyAction ? <Button onClick={onEmptyAction}>{emptyActionLabel}</Button> : undefined}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={getRowId(row)}
                tabIndex={onRow ? 0 : undefined}
                className={cn("border-b border-line last:border-b-0", onRow && "cursor-pointer hover:bg-sage/50")}
                onClick={onRow ? () => onRow(row) : undefined}
                onKeyDown={
                  onRow
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRow(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-2.5 align-middle", column.align === "right" && "text-right", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2 text-[12px] text-muted">
        <p className="num">
          {start + 1}–{Math.min(start + size, rows.length)} of {rows.length}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Rows
            <select
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-7 border border-line bg-panel px-1.5 text-[12px]"
            >
              {[5, 6, 8].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button variant="ghost" disabled={current === 1} onClick={() => setPage(current - 1)}>
            Previous
          </Button>
          <span className="num">
            {current}/{pages}
          </span>
          <Button variant="ghost" disabled={current === pages} onClick={() => setPage(current + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
