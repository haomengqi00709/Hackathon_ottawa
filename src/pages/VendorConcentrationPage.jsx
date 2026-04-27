import React, { useState } from 'react';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import PaginationBar from '@/components/PaginationBar';
import { Button } from '@/components/ui/button';

const fmt = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(n));

export default function VendorConcentrationPage() {
  const [dim, setDim] = useState('economic_object_code');

  const { rows, meta, isLoading, isFetching, error, setPage } = usePagedQuery({
    key: ['contracts', 'concentration', dim],
    path: '/api/contracts/concentration',
    params: { dim },
    defaultLimit: 100,
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Vendor Concentration (HHI)"
        problemId="5"
        dataSources={['public.contracts']}
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} categories with at least $1M total spend. HHI > 2,500 typically indicates a category dominated by a single vendor — a regulatory concern threshold for competition policy.`
            : 'HHI per spend category. HHI > 2,500 typically indicates a category dominated by a single vendor.'
        }
        rightSlot={
          <div className="flex gap-1">
            {[
              ['economic_object_code', 'object code'],
              ['commodity_code', 'commodity'],
              ['owner_org_title', 'department'],
            ].map(([v, label]) => (
              <Button key={v} variant={dim === v ? 'default' : 'outline'} size="sm" onClick={() => setDim(v)}>
                by {label}
              </Button>
            ))}
          </div>
        }
      />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <DataTable
          loading={isLoading}
          error={error}
          rows={rows}
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
        <PaginationBar meta={meta} loading={isFetching} onChange={setPage} />
      </div>
    </div>
  );
}
