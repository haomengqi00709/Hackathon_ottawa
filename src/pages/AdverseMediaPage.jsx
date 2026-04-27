import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBase } from '@/api/httpClient';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';

async function fetchData(path) {
  const r = await fetch(`${apiBase()}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  const json = await r.json();
  return json.data;
}

export default function AdverseMediaPage() {
  const [days, setDays] = useState(365);

  const q = useQuery({
    queryKey: ['adverse-media', 'recent', days],
    queryFn: () => fetchData(`/api/adverse-media/recent?days=${days}&minSeverity=2&limit=200`),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Adverse Media"
        problemId="10"
        dataSources={['media_adverse_events (sqlite)']}
        subtitle="Regulatory enforcement, fraud allegations, sanctions, and CRA charity revocations matched against the funding portfolio. Severity 1–5; the FE shows ≥ 2 by default to filter noise."
        rightSlot={
          <div className="flex gap-1">
            {[90, 180, 365, 730].map((d) => (
              <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
                last {d}d
              </Button>
            ))}
          </div>
        }
      />
      {q.data && q.data.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-1">No adverse-media events ingested yet.</p>
          <p className="text-muted-foreground">
            Plumbing exists (<code>media_adverse_events</code> table; <code>POST /api/adverse-media</code>). Day-10 of
            the plan ingests CRA revocations + OFSI sanctions feeds.
          </p>
        </div>
      )}
      <DataTable
        loading={q.isLoading}
        error={q.error}
        rows={q.data ?? []}
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
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  open
                </a>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </div>
  );
}
