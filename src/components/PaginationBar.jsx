import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZES = [50, 100, 250, 500, 1000];

/**
 * Generic offset-pagination bar. Pass:
 *   meta:      { count, total, offset, limit, nextOffset }   (server response)
 *   onChange:  ({offset, limit}) => void
 *   pageSizes: optional override array (default 50/100/250/500/1000)
 *   loading:   optional boolean to disable nav while a page is fetching
 */
export default function PaginationBar({ meta, onChange, pageSizes = PAGE_SIZES, loading }) {
  if (!meta) return null;
  const total = Number(meta.total ?? 0);
  const offset = Number(meta.offset ?? 0);
  const limit = Number(meta.limit ?? 50);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + Number(meta.count ?? 0), total);

  const goto = (next) => {
    const safeOffset = Math.max(0, Math.min(next, Math.max(0, total - 1)));
    onChange({ offset: safeOffset, limit });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-border bg-muted/30 text-xs">
      <span className="text-muted-foreground tabular-nums">
        {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </span>

      <div className="flex-1" />

      <span className="text-muted-foreground">Rows per page</span>
      <Select
        value={String(limit)}
        onValueChange={(v) => onChange({ offset: 0, limit: Number(v) })}
        disabled={loading}
      >
        <SelectTrigger className="h-7 w-[80px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizes.map((s) => (
            <SelectItem key={s} value={String(s)}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" className="h-7 w-7"
        disabled={loading || offset === 0}
        onClick={() => goto(0)} title="First">
        <ChevronsLeft className="w-3.5 h-3.5" />
      </Button>
      <Button variant="outline" size="icon" className="h-7 w-7"
        disabled={loading || offset === 0}
        onClick={() => goto(offset - limit)} title="Previous">
        <ChevronLeft className="w-3.5 h-3.5" />
      </Button>
      <span className="px-2 tabular-nums">
        page {currentPage.toLocaleString()} / {totalPages.toLocaleString()}
      </span>
      <Button variant="outline" size="icon" className="h-7 w-7"
        disabled={loading || meta.nextOffset == null}
        onClick={() => goto(offset + limit)} title="Next">
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
      <Button variant="outline" size="icon" className="h-7 w-7"
        disabled={loading || meta.nextOffset == null}
        onClick={() => goto((totalPages - 1) * limit)} title="Last">
        <ChevronsRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
