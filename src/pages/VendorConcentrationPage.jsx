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

export default function VendorConcentrationPage() {
  const [dim, setDim] = useState('economic_object_code');

  const q = useQuery({
    queryKey: ['contracts', 'concentration', dim],
    queryFn: () => fetchData(`/api/contracts/concentration?dim=${dim}&limit=80`),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Vendor Concentration (HHI)"
        problemId="5"
        dataSources={['public.contracts']}
        subtitle="Herfindahl–Hirschman Index per spend category. HHI > 2,500 typically indicates a category dominated by a single vendor — a regulatory concern threshold for competition policy."
        rightSlot={
          <div className="flex gap-1">
            {[
              ['economic_object_code', 'object code'],
              ['commodity_code', 'commodity'],
              ['owner_org_title', 'department'],
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
          { key: 'category', label: dim === 'owner_org_title' ? 'Department' : 'Category' },
          { key: 'vendor_count', label: 'Vendors', align: 'right' },
          {
            key: 'hhi',
            label: 'HHI',
            align: 'right',
            render: (r) => {
              const v = Number(r.hhi);
              const cls = v > 2500 ? 'text-red-600 font-bold' : v > 1500 ? 'text-yellow-600' : 'text-green-600';
              return <span className={cls}>{v.toFixed(0)}</span>;
            },
          },
          { key: 'total', label: 'Total spend', align: 'right', render: (r) => fmt(r.total) },
          {
            key: 'top_share',
            label: 'Top vendor share',
            align: 'right',
            render: (r) =>
              r.total && r.top_vendor_value
                ? `${((Number(r.top_vendor_value) / Number(r.total)) * 100).toFixed(1)}%`
                : '—',
          },
        ]}
      />
    </div>
  );
}
