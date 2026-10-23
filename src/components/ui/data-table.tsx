import type { Key, ReactNode } from "react";
import { EmptyState } from "./async-states";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => Key;
  emptyMessage?: string;
};

export function DataTable<Row>({
  columns,
  emptyMessage = "There are no records to display.",
  getRowKey,
  rows,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white px-5 py-8">
        <EmptyState title="Nothing here yet" description={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="min-w-full divide-y divide-border text-left text-sm">
        <thead className="bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-5 py-3.5">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="text-ink">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-5 py-4">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
