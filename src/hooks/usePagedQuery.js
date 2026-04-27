import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reqEnvelope } from '@/api/httpClient';

/**
 * Wraps useQuery for an offset-paginated endpoint that returns
 * { data: [...], meta: { count, total, offset, limit, nextOffset } }.
 *
 *   const { rows, meta, isFetching, error, page, setPage } =
 *     usePagedQuery({
 *       key: ['contracts', 'amendments', minRatio],
 *       path: '/api/contracts/amendments',
 *       params: { minRatio, minOriginal: 10000 },     // server filters
 *       defaultLimit: 100,
 *     });
 *
 * The hook resets to page 0 whenever `params` (or `key`) changes.
 */
export function usePagedQuery({ key, path, params = {}, defaultLimit = 100 }) {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(defaultLimit);

  // Reset to first page when filters change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setOffset(0); }, [JSON.stringify(params)]);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    qs.set(k, String(v));
  }
  qs.set('offset', String(offset));
  qs.set('limit', String(limit));

  const q = useQuery({
    queryKey: [...key, offset, limit],
    queryFn: () => reqEnvelope(`${path}?${qs.toString()}`),
    placeholderData: keepPreviousData,
  });

  return {
    rows: q.data?.data ?? [],
    meta: q.data?.meta ?? null,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    error: q.error,
    setPage: ({ offset: o, limit: l }) => { setOffset(o); setLimit(l); },
  };
}
