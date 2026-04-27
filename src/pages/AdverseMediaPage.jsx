import React, { useState } from 'react';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import PaginationBar from '@/components/PaginationBar';
import { Button } from '@/components/ui/button';

export default function AdverseMediaPage() {
  const [minSeverity, setMinSeverity] = useState(2);

  const { rows, meta, isLoading, isFetching, error, setPage } = usePagedQuery({
    key: ['adverse-media', minSeverity],
    path: '/api/adverse-media',
    params: { minSeverity },
    defaultLimit: 100,
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Adverse Media"
        problemId="10"
        dataSources={['media_adverse_events (sqlite)']}
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} events at severity ≥ ${minSeverity}.`
            : 'Regulatory enforcement, fraud allegations, sanctions, and CRA charity revocations.'
        }
        rightSlot={
          <div className="flex gap-1 items-center">
            <span className="text-xs text-muted-foreground">min severity</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <Button key={s} variant={minSeverity === s ? 'default' : 'outline'} size="sm" onClick={() => setMinSeverity(s)}>≥ {s}</Button>
            ))}
          </div>
        }
      />
      {meta && meta.total === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-1">No adverse-media events ingested yet.</p>
          <p className="text-muted-foreground">
            Plumbing exists (<code>media_adverse_events</code> table; <code>POST /api/adverse-media</code>). Day-10 of
            the plan ingests CRA revocations + OFSI sanctions feeds.
          </p>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <DataTable
          loading={isLoading}
          error={error}
          rows={rows}
          columns={[
            { key: 'eventDate', label: 'Date' },
            { key: 'eventType', label: 'Type' },
            {
              key: 'severity',
              label: 'Severity',
              align: 'right',
              render: (r) => {
                const sev = Number(r.severity);
                const cls = sev >= 4 ? 'text-red-600 font-bold' : sev >= 3 ? 'text-yellow-600' : 'text-muted-foreground';
                return <span className={cls}>{sev}</span>;
              },
            },
            { key: 'entityCanonicalName', label: 'Entity' },
            { key: 'source', label: 'Source' },
            {
              key: 'sourceUrl',
              label: 'Link',
              render: (r) =>
                r.sourceUrl ? (
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">open</a>
                ) : '—',
            },
          ]}
        />
        <PaginationBar meta={meta} loading={isFetching} onChange={setPage} />
      </div>
    </div>
  );
}
