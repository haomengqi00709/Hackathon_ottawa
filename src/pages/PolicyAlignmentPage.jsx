import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBase } from '@/api/httpClient';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

async function fetchData(path) {
  const r = await fetch(`${apiBase()}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  const json = await r.json();
  return json.data;
}

export default function PolicyAlignmentPage() {
  const q = useQuery({
    queryKey: ['policies'],
    queryFn: () => fetchData('/api/policies'),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Policy Alignment"
        problemId="7"
        dataSources={['app_policy_priorities', 'fed.grants_contributions']}
        subtitle="Stated policy priorities (housing, reconciliation, climate, mental health, etc.) vs. actual flow of funds. Seed the priorities table via POST /api/policies, then drill into a row for spend coverage by year."
      />
      {q.data && q.data.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-1">No policy priorities seeded yet.</p>
          <p className="text-muted-foreground">
            Add 5–10 priorities via <code>POST /api/policies</code>:{' '}
            <code className="text-xs">
              {'{'}"shortName":"emissions_2030","displayName":"GHG –40% by 2030","matchKeywords":["emission","climate","carbon"]{'}'}
            </code>
          </p>
        </div>
      )}
      <DataTable
        loading={q.isLoading}
        error={q.error}
        rows={q.data ?? []}
        columns={[
          { key: 'shortName', label: 'Short name' },
          { key: 'displayName', label: 'Priority' },
          { key: 'targetMetric', label: 'Target' },
          { key: 'targetValue', label: 'Value', align: 'right' },
          { key: 'targetYear', label: 'Year', align: 'right' },
          { key: 'owningDept', label: 'Owner' },
        ]}
      />
    </div>
  );
}
