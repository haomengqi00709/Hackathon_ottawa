import React from 'react';
import { Loader2 } from 'lucide-react';

// columns: [{ key, label, render?, align?, className? }]
export default function DataTable({ rows = [], columns, loading, error, empty }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-auto max-h-[75vh]">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 sticky top-0 backdrop-blur">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border ${
                    c.align === 'right' ? 'text-right' : ''
                  } ${c.className ?? ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-red-600">
                  {String(error.message ?? error)}
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-muted-foreground italic">
                  {empty ?? 'No rows'}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              rows.map((r, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 border-b border-border/40 ${
                        c.align === 'right' ? 'text-right tabular-nums' : ''
                      } ${c.className ?? ''}`}
                    >
                      {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
