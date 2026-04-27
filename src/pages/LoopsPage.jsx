import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBase } from '@/api/httpClient';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronRight, Repeat } from 'lucide-react';

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

export default function LoopsPage() {
  const [excludeGiantSCC, setExcludeGiantSCC] = useState(true);
  const [selectedBn, setSelectedBn] = useState(null);

  const list = useQuery({
    queryKey: ['loops', 'charities', excludeGiantSCC],
    queryFn: () => fetchData(`/api/loops/charities?excludeGiantSCC=${excludeGiantSCC}&limit=200`),
  });

  const detail = useQuery({
    queryKey: ['loops', 'charity', selectedBn],
    queryFn: () => fetchData(`/api/loops/charities/${selectedBn}`),
    enabled: Boolean(selectedBn),
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Funding Loops"
        problemId="3"
        dataSources={['cra.loop_universe', 'cra.loops', 'cra.scc_components']}
        subtitle="Charities that participate in money-flow cycles. Distinguishes structurally normal denominational hierarchies from loops that may exist to inflate revenue or absorb funds into overhead."
        rightSlot={
          <Button variant="outline" size="sm" onClick={() => setExcludeGiantSCC((v) => !v)}>
            {excludeGiantSCC ? 'Including' : 'Excluding'}: giant SCC #1
          </Button>
        }
      />

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Left: ranked list */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Top loop participants</span>
            {list.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {list.data && <span className="text-muted-foreground">{list.data.length} rows</span>}
          </div>
          {list.error && (
            <div className="p-4 text-sm text-red-600">Error: {String(list.error.message ?? list.error)}</div>
          )}
          <div className="divide-y divide-border max-h-[70vh] overflow-auto">
            {(list.data ?? []).map((row) => (
              <button
                key={row.bn}
                onClick={() => setSelectedBn(row.bn)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3 ${
                  selectedBn === row.bn ? 'bg-muted/60' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{row.legal_name || row.bn}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.designation && <span className="mr-2">{row.designation}</span>}
                    BN {row.bn} · SCC {row.scc_id ?? '—'}
                  </p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-sm font-bold tabular-nums">{row.score ?? 0}</span>
                  <span className="text-[10px] text-muted-foreground">{row.total_loops} loops</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl">
          {!selectedBn && (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Repeat className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Select a charity to see its loops.
            </div>
          )}
          {selectedBn && detail.isLoading && (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {detail.data && (
            <div className="p-5 space-y-5">
              <div>
                <h2 className="font-bold text-lg leading-tight">{detail.data.summary.legal_name}</h2>
                <p className="text-xs text-muted-foreground">BN {detail.data.summary.bn}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Score" value={detail.data.summary.score} />
                <Stat label="Total loops" value={detail.data.summary.total_loops} />
                <Stat label="Max bottleneck" value={fmt(detail.data.summary.max_bottleneck)} />
                <Stat label="Total circular $" value={fmt(detail.data.summary.total_circular_amt)} />
                <Stat label="Revenue" value={fmt(detail.data.summary.revenue)} />
                <Stat label="Compensation" value={fmt(detail.data.summary.compensation_spending)} />
                <Stat label="Designation" value={detail.data.summary.designation || '—'} />
                <Stat label="Category" value={detail.data.summary.category || '—'} />
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Loops</h3>
                <div className="space-y-2 max-h-[40vh] overflow-auto pr-2">
                  {(detail.data.loops ?? []).map((loop) => (
                    <div key={loop.id} className="border border-border rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {loop.hops}-hop
                        </Badge>
                        {loop.same_year && (
                          <Badge variant="destructive" className="text-[10px]">
                            same fiscal year
                          </Badge>
                        )}
                        <span className="ml-auto text-muted-foreground">
                          {loop.min_year}–{loop.max_year}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] break-all">{loop.path_display}</p>
                      <p className="mt-1 text-muted-foreground">
                        bottleneck {fmt(loop.bottleneck_amt)} · total flow {fmt(loop.total_flow)}
                      </p>
                    </div>
                  ))}
                </div>
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
