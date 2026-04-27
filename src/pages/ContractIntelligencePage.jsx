import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reqEnvelope } from '@/api/httpClient';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';

const fmt = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(n));

// This page renders YoY rows per category (not paginated by row — analysts
// typically want the whole time series for one category). We keep a high
// limit cap and let the user pull a category-filtered view when needed.
export default function ContractIntelligencePage() {
  const [dim, setDim] = useState('economic_object_code');
  const [limit, setLimit] = useState(2000);

  const q = useQuery({
    queryKey: ['contracts', 'intelligence', dim, limit],
    queryFn: () => reqEnvelope(`/api/contracts/intelligence?dim=${dim}&limit=${limit}`),
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Contract Intelligence"
        problemId="9"
        dataSources={['public.contracts']}
        subtitle="What is Canada actually buying, and is it paying more over time? YoY spend / volume / unit-cost / vendor-count by category."
        rightSlot={
          <div className="flex gap-1 items-center">
            {[
              ['economic_object_code', 'object code'],
              ['commodity_code', 'commodity'],
            ].map(([v, label]) => (
              <Button key={v} variant={dim === v ? 'default' : 'outline'} size="sm" onClick={() => setDim(v)}>
                by {label}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-3">rows</span>
            {[500, 2000, 10000].map((n) => (
              <Button key={n} variant={limit === n ? 'default' : 'outline'} size="sm" onClick={() => setLimit(n)}>{n}</Button>
            ))}
          </div>
        }
      />
      <div className="text-xs text-muted-foreground italic px-1">
        Fetched {rows.length.toLocaleString()} rows. The category × year matrix is unbounded;
        bump the row cap if your analysis needs more depth.
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <DataTable
          loading={q.isLoading}
          error={q.error}
          rows={rows}
          columns={[
            { key: 'category', label: 'Category' },
            { key: 'yr', label: 'Year', align: 'right' },
            { key: 'n', label: 'Contracts', align: 'right' },
            { key: 'spend', label: 'Spend', align: 'right', render: (r) => fmt(r.spend) },
            { key: 'avg_v', label: 'Avg / contract', align: 'right', render: (r) => fmt(r.avg_v) },
            { key: 'vendors', label: '# vendors', align: 'right' },
          ]}
        />
      </div>
    </div>
  );
}
