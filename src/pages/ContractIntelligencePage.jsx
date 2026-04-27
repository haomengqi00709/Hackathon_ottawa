import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBase } from '@/api/httpClient';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';

const fmt = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(n));

async function fetchData(path) {
  const r = await fetch(`${apiBase()}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  const json = await r.json();
  return json.data;
}

export default function ContractIntelligencePage() {
  const [dim, setDim] = useState('economic_object_code');

  const q = useQuery({
    queryKey: ['contracts', 'intelligence', dim],
    queryFn: () => fetchData(`/api/contracts/intelligence?dim=${dim}&limit=500`),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Contract Intelligence"
        problemId="9"
        dataSources={['public.contracts']}
        subtitle="What is Canada actually buying, and is it paying more over time? YoY spend / volume / unit-cost / vendor-count by category. Where Δunit-cost > 0 and Δvendor-count ≤ 0, the taxpayer is paying more for less competition."
        rightSlot={
          <div className="flex gap-1">
            {[
              ['economic_object_code', 'object code'],
              ['commodity_code', 'commodity'],
            ].map(([v, label]) => (
              <Button
                key={v}
                variant={dim === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDim(v)}
              >
                by {label}
              </Button>
            ))}
          </div>
        }
      />
      <DataTable
        loading={q.isLoading}
        error={q.error}
        rows={q.data ?? []}
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
  );
}
