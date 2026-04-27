import React, { useState } from 'react';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import PaginationBar from '@/components/PaginationBar';
import { Button } from '@/components/ui/button';

export default function NetworksPage() {
  const [year, setYear] = useState(2023);
  const [minBoards, setMinBoards] = useState(5);

  const { rows, meta, isLoading, isFetching, error, setPage } = usePagedQuery({
    key: ['networks', 'interlocks', year, minBoards],
    path: '/api/networks/interlocks',
    params: { fiscalYear: year, minBoards },
    defaultLimit: 100,
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Director Interlocks"
        problemId="6"
        dataSources={['cra.cra_directors', 'cra.cra_identification']}
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} individuals on at least ${minBoards} boards in FY${year}.`
            : 'Individuals who sit on multiple charity boards in the same fiscal year.'
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">FY</span>
            {[2021, 2022, 2023].map((y) => (
              <Button key={y} variant={year === y ? 'default' : 'outline'} size="sm" onClick={() => setYear(y)}>{y}</Button>
            ))}
            <span className="text-xs text-muted-foreground ml-2">≥ boards</span>
            {[3, 5, 8].map((m) => (
              <Button key={m} variant={minBoards === m ? 'default' : 'outline'} size="sm" onClick={() => setMinBoards(m)}>{m}</Button>
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
            { key: 'last_name', label: 'Last' },
            { key: 'first_name', label: 'First' },
            { key: 'n_boards', label: '# boards', align: 'right' },
            {
              key: 'boards',
              label: 'Boards (BNs)',
              render: (r) =>
                Array.isArray(r.boards) ? (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {r.boards.slice(0, 4).join(', ')}{r.boards.length > 4 ? ` +${r.boards.length - 4}` : ''}
                  </span>
                ) : String(r.boards ?? ''),
            },
          ]}
        />
        <PaginationBar meta={meta} loading={isFetching} onChange={setPage} />
      </div>
    </div>
  );
}
