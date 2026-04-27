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

export default function AmendmentCreepPage() {
  const [minRatio, setMinRatio] = useState(3);

  const q = useQuery({
    queryKey: ['contracts', 'amendments', minRatio],
    queryFn: () =>
      fetchData(`/api/contracts/amendments?minRatio=${minRatio}&minOriginal=10000&limit=100`),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Sole Source & Amendment Creep"
        problemId="4"
        dataSources={['public.contracts']}
        subtitle="Federal contracts whose amended value vastly exceeds the original bid. The most extreme case in the dataset: Desire2Learn → Canada School of Public Service, $33.9K → $40.7M (1,200×)."
        rightSlot={
          <div className="flex items-center gap-1">
            {[2, 3, 5, 10, 50].map((r) => (
              <Button
                key={r}
                variant={minRatio === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMinRatio(r)}
              >
                ≥{r}×
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
    </div>
  );
}
