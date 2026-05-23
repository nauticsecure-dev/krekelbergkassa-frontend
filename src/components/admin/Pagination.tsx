import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { PaginationMeta } from '@/lib/api-types';

export function Pagination({
  meta,
  onChange,
}: {
  meta?: PaginationMeta;
  onChange: (page: number) => void;
}) {
  if (!meta || meta.last_page <= 1) return null;

  const current = meta.current_page;
  const pages = buildPages(current, meta.last_page);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => current > 1 && onChange(current - 1)}
        disabled={current <= 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-navy-100 bg-white text-navy-600 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, idx) => {
        if (p === '...') {
          return (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-navy-400">
              ...
            </span>
          );
        }
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'h-8 min-w-[32px] rounded-md px-2 text-xs',
              p === current
                ? 'bg-navy-900 font-semibold text-white'
                : 'text-navy-600 hover:bg-sand-100'
            )}
          >
            {p}
          </button>
        );
      })}
      <button
        onClick={() => current < meta.last_page && onChange(current + 1)}
        disabled={current >= meta.last_page}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-navy-100 bg-white text-navy-600 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function buildPages(current: number, total: number): Array<number | '...'> {
  const pages: Array<number | '...'> = [];
  const add = (value: number | '...') => pages.push(value);

  add(1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) add('...');
  for (let i = start; i <= end; i += 1) add(i);
  if (end < total - 1) add('...');
  if (total > 1) add(total);

  return pages;
}
