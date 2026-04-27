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

export default function AmendmentCreepPage() {
  const [minRatio, setMinRatio] = useState(3);

  const { rows, meta, isLoading, isFetching, error, setPage } = usePagedQuery({
    key: ['contracts', 'amendments', minRatio],
    path: '/api/contracts/amendments',
    params: { minRatio, minOriginal: 10000 },
    defaultLimit: 100,
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Sole Source & Amendment Creep"
        problemId="4"
        dataSources={['public.contracts']}
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} federal contracts where the amended value is at least ${minRatio}× the original bid (min original $10K).`
            : 'Federal contracts whose amended value vastly exceeds the original bid.'
        }
        rightSlot={
          <div className="flex items-center gap-1">
            {[2, 3, 5, 10, 50].map((r) => (
              <Button key={r} variant={minRatio === r ? 'default' : 'outline'} size="sm" onClick={() => setMinRatio(r)}>
                ≥{r}×
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
            { key: 'vendor_name', label: 'Vendor' },
            { key: 'owner_org_title', label: 'Department' },
            { key: 'original_value', label: 'Original', align: 'right', render: (r) => fmt(r.original_value) },
            { key: 'current_value', label: 'Current', align: 'right', render: (r) => fmt(r.current_value) },
            {
              key: 'ratio',
              label: 'Ratio',
              align: 'right',
              render: (r) => (r.ratio ? `${Number(r.ratio).toFixed(1)}×` : '—'),
            },
            { key: 'former_public_servant', label: 'Ex-PS' },
            { key: 'contract_date', label: 'Date' },
          ]}
        />
        <PaginationBar meta={meta} loading={isFetching} onChange={setPage} />
      </div>
    </div>
  );
}
