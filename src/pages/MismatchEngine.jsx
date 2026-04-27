import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, ScanSearch, AlertTriangle, CheckCircle2, Minus, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { runMismatchEngine, buildMismatchInput, getMismatchStyle, MISMATCH_RULES } from '@/lib/mismatchEngine';
import MismatchCard from '@/components/mismatch/MismatchCard';

const CLASSIFICATIONS = ['All', 'High mismatch', 'Moderate mismatch', 'No mismatch detected'];

function SummaryPill({ label, count, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`text-3xl font-bold leading-none ${color}`}>{count}</span>
    </div>
  );
}

export default function MismatchEngine() {
  const [filter, setFilter] = useState('All');

  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => base44.entities.Organizations.list(),
  });
  const { data: allFinancials = [], isLoading: loadingFin } = useQuery({
    queryKey: ['financials-all'],
    queryFn: () => base44.entities.FinancialIndicators.list(),
  });
  const { data: allFunding = [], isLoading: loadingFund } = useQuery({
    queryKey: ['funding-all'],
    queryFn: () => base44.entities.FundingRecords.list(),
  });

  const loading = loadingOrgs || loadingFin || loadingFund;

  // Run mismatch engine across all orgs
  const results = useMemo(() => {
    return orgs.map(org => {
      const financials = allFinancials.filter(f => f.organizationId === org.id);
      const funding = allFunding.filter(f => f.organizationId === org.id);
      const input = buildMismatchInput(org, funding, financials);
      const result = runMismatchEngine(input);
      return { ...result, orgId: org.id };
    }).sort((a, b) => b.mismatch_score - a.mismatch_score);
  }, [orgs, allFinancials, allFunding]);

  const highCount = results.filter(r => r.classification === 'High mismatch').length;
  const modCount = results.filter(r => r.classification === 'Moderate mismatch').length;
  const noneCount = results.filter(r => r.classification === 'No mismatch detected').length;

  const filtered = filter === 'All' ? results : results.filter(r => r.classification === filter);

  // Rule frequency
  const ruleFrequency = useMemo(() => {
    const counts = {};
    Object.keys(MISMATCH_RULES).forEach(id => { counts[id] = 0; });
    results.forEach(r => r.triggered_rules.forEach(rule => { counts[rule.id] = (counts[rule.id] || 0) + 1; }));
    return counts;
  }, [results]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Running mismatch analysis…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <ScanSearch className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mismatch Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Detects internal contradictions within submitted organizational data — not individual anomalies, but structural inconsistencies between fields.
            </p>
          </div>
        </div>
        <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-5 py-3">
          <p className="text-sm font-semibold text-primary">
            Is what this organization reports internally consistent?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each rule checks whether two or more submitted fields contradict each other. A mismatch signal does not indicate misconduct — it flags areas where the submitted data does not cohere and a reviewer should seek clarification.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill label="Organizations" count={results.length} color="text-foreground" />
        <SummaryPill label="High Mismatch" count={highCount} color="text-red-600" />
        <SummaryPill label="Moderate Mismatch" count={modCount} color="text-yellow-600" />
        <SummaryPill label="No Mismatch" count={noneCount} color="text-green-600" />
      </div>

      {/* Rule frequency breakdown */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Rule Frequency Across Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(MISMATCH_RULES).map(([id, rule]) => {
                const count = ruleFrequency[id] || 0;
                const pct = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
                return (
                  <div key={id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{rule.label}</span>
                      <span className="text-muted-foreground tabular-nums">{count} org{count !== 1 ? 's' : ''} · {pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 50 ? 'bg-red-400' : pct >= 25 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{rule.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {CLASSIFICATIONS.map(cls => {
          const count = cls === 'All'
            ? results.length
            : results.filter(r => r.classification === cls).length;
          const isActive = filter === cls;
          const style = cls === 'High mismatch'
            ? 'border-red-300 text-red-700 bg-red-50'
            : cls === 'Moderate mismatch'
            ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
            : cls === 'No mismatch detected'
            ? 'border-green-300 text-green-700 bg-green-50'
            : 'border-border text-foreground bg-card';

          return (
            <button
              key={cls}
              onClick={() => setFilter(cls)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                isActive
                  ? style + ' ring-2 ring-offset-1 ring-primary/30 font-semibold'
                  : 'border-border text-muted-foreground bg-card hover:bg-muted'
              }`}
            >
              {cls} ({count})
            </button>
          );
        })}
      </div>

      {/* Results grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ScanSearch className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No organizations match this filter.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(result => (
            <MismatchCard key={result.orgId} result={result} orgId={result.orgId} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important:</strong> Mismatch signals reflect internal data contradictions only. They do not constitute evidence of fraud, misconduct, or intentional misrepresentation. All findings should be treated as prompts for reviewer inquiry and clarification — not as determinations of fact.
        </p>
      </div>
    </div>
  );
}