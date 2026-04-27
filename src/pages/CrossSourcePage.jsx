import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBase } from '@/api/httpClient';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import PageHeader from '@/components/PageHeader';
import PaginationBar from '@/components/PaginationBar';
import { Loader2, ChevronRight, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const fmt = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }).format(Number(n));

async function fetchData(path) {
  const r = await fetch(`${apiBase()}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  const json = await r.json();
  return json.data;
}

export default function CrossSourcePage() {
  const [selectedId, setSelectedId] = useState(null);

  const { rows: listRows, meta: listMeta, isLoading: listLoading, isFetching: listFetching, error: listError, setPage } = usePagedQuery({
    key: ['cross-source', 'list'],
    path: '/api/cross-source',
    params: { minSources: 2 },
    defaultLimit: 100,
  });

  const detail = useQuery({
    queryKey: ['cross-source', selectedId],
    queryFn: () => fetchData(`/api/cross-source/${selectedId}`),
    enabled: Boolean(selectedId),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Cross-Source Recipients"
        problemId="8"
        dataSources={['general.vw_entity_funding']}
        subtitle="Recipients funded across more than one of {federal, Alberta provincial, CRA-derived government revenue}. Surfaces potential duplicative funding for the same purpose, and informs gap analysis."
      />

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">
              Multi-source recipients
            </span>
            {(listLoading || listFetching) && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {listMeta && <span className="text-muted-foreground">{listMeta.total.toLocaleString()} total</span>}
          </div>
          {listError && <div className="p-4 text-sm text-red-600">Error: {String(listError.message)}</div>}
          <div className="divide-y divide-border max-h-[60vh] overflow-auto">
            {listRows.map((row) => (
              <button
                key={row.entity_id}
                onClick={() => setSelectedId(row.entity_id)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3 ${
                  selectedId === row.entity_id ? 'bg-muted/60' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{row.canonical_name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(row.dataset_sources ?? []).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px] uppercase">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-sm font-bold tabular-nums">{fmt(row.total_all_funding)}</span>
                  <span className="text-[10px] text-muted-foreground">total</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
          <PaginationBar meta={listMeta} loading={listFetching} onChange={setPage} pageSizes={[50, 100, 250]} />
        </div>

        <div className="lg:col-span-3 bg-card border border-border rounded-xl">
          {!selectedId && (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Select an entity to break down its funding by source.
            </div>
          )}
          {selectedId && detail.isLoading && (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {detail.data && (
            <div className="p-5 space-y-5">
              <div>
                <h2 className="font-bold text-lg">{detail.data.main.canonical_name}</h2>
                <p className="text-xs text-muted-foreground">
                  {(detail.data.main.dataset_sources ?? []).join(', ')} · entity_id {detail.data.main.entity_id}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Total" value={fmt(detail.data.main.total_all_funding)} />
                <Stat label="CRA revenue" value={fmt(detail.data.main.cra_total_revenue)} />
                <Stat label="Federal grants" value={fmt(detail.data.main.fed_total_grants)} />
                <Stat label="AB grants" value={fmt(detail.data.main.ab_total_grants)} />
                <Stat label="AB contracts" value={fmt(detail.data.main.ab_total_contracts)} />
                <Stat label="AB sole-source" value={fmt(detail.data.main.ab_total_sole_source)} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Section title="Top federal departments" rows={detail.data.fedTopDepts} keyField="dept" />
                <Section title="Top AB ministries" rows={detail.data.abTopMinistries} keyField="ministry" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold leading-tight">{value ?? '—'}</p>
    </div>
  );
}

function Section({ title, rows, keyField }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1 text-xs">
        {(rows ?? []).map((r) => (
          <div key={r[keyField]} className="flex items-center gap-2 border-b border-border/50 py-1">
            <span className="flex-1 truncate">{r[keyField]}</span>
            <span className="text-muted-foreground tabular-nums">×{r.n}</span>
            <span className="font-medium tabular-nums">{fmt(r.total)}</span>
          </div>
        ))}
        {(rows ?? []).length === 0 && (
          <p className="text-muted-foreground italic">no rows</p>
        )}
      </div>
    </div>
  );
}
