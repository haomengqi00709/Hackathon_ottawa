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

export default function NetworksPage() {
  const [year, setYear] = useState(2023);
  const [minBoards, setMinBoards] = useState(5);

  const q = useQuery({
    queryKey: ['networks', 'interlocks', year, minBoards],
    queryFn: () =>
      fetchData(`/api/networks/interlocks?fiscalYear=${year}&minBoards=${minBoards}&limit=200`),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Director Interlocks"
        problemId="6"
        dataSources={['cra.cra_directors', 'cra.cra_identification']}
        subtitle="Individuals who sit on multiple charity boards in the same fiscal year. Interlock alone is not a red flag — directors of federated charities or denominational groups will appear here. Cross-reference with funding flows to find suspicious patterns."
        rightSlot={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">FY</span>
            {[2021, 2022, 2023].map((y) => (
              <Button key={y} variant={year === y ? 'default' : 'outline'} size="sm" onClick={() => setYear(y)}>
                {y}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-2">≥ boards</span>
            {[3, 5, 8].map((m) => (
              <Button
                key={m}
                variant={minBoards === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMinBoards(m)}
              >
                {m}
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
          { key: 'last_name', label: 'Last' },
          { key: 'first_name', label: 'First' },
          { key: 'n_boards', label: '# boards', align: 'right' },
          {
            key: 'boards',
            label: 'Boards (BNs)',
            render: (r) =>
              Array.isArray(r.boards) ? (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {r.boards.slice(0, 4).join(', ')}
                  {r.boards.length > 4 ? ` +${r.boards.length - 4}` : ''}
                </span>
              ) : (
                String(r.boards ?? '')
              ),
          },
        ]}
      />
    </div>
  );
}
