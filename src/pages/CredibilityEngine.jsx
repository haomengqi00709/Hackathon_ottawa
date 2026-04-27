import React, { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Activity, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getPatternStyle } from '@/lib/credibilityEngine';
import CredibilityCard from '@/components/credibility/CredibilityCard';
import PaginationBar from '@/components/PaginationBar';

const CLASSIFICATIONS = ['All', 'Strong pattern signal', 'Moderate pattern concern', 'No concerning pattern'];

// Integrity-concern derived rules — the precompute writes one
// integrityConcernScore per row plus the four ghost flags. Each ghost flag
// IS a credibility signal observable at single-year granularity (the engine
// previously needed multi-year filings to derive equivalents).
const INTEGRITY_RULES = {
  NO_PAID_EMPLOYEES: {
    id: 'NO_PAID_EMPLOYEES',
    label: 'No reported workforce',
    detail: 'The latest T3010 reports zero paid positions. Sustained absence of headcount is a structural credibility concern at any non-trivial funding level.',
  },
  NEAR_TOTAL_GOVT_DEPENDENCY: {
    id: 'NEAR_TOTAL_GOVT_DEPENDENCY',
    label: 'Single-funder concentration',
    detail: 'Government revenue ≥90% of total revenue. The organization\'s viability is tightly coupled to one funder; the precompute classifies this as a credibility risk independent of operational signals.',
  },
  NEAR_ZERO_PROGRAMS: {
    id: 'NEAR_ZERO_PROGRAMS',
    label: 'Negligible program activity',
    detail: 'Program-delivery spending ≤5% of total expenses. A heavily funded organization with negligible program activity is a credibility concern.',
  },
  COMP_WITH_NO_EMPLOYEES: {
    id: 'COMP_WITH_NO_EMPLOYEES',
    label: 'Compensation without staff',
    detail: 'Compensation expense >$10K with zero employees on the same filing. The two reported numbers are mechanically inconsistent.',
  },
};

function classifyByIntegrity(integrityScore, ghostScore) {
  // integrityConcernScore from the engine is on 0–100; ghostScore is on 0–10.
  // Combine: take the worse of the two normalized to 0–100.
  const ghostNorm = (ghostScore ?? 0) * 10;
  const score = Math.max(integrityScore ?? 0, ghostNorm);
  if (score >= 60) return 'Strong pattern signal';
  if (score >= 30) return 'Moderate pattern concern';
  return 'No concerning pattern';
}

function buildExplanation(name, flags, integrityScore) {
  if (flags.length === 0 && (integrityScore ?? 0) < 30) {
    return `${name} shows no concerning credibility signals in the precomputed pool.`;
  }
  const flagLabels = flags.map(f => INTEGRITY_RULES[f]?.label).filter(Boolean);
  const intFrag = integrityScore != null ? `Integrity concern: ${Math.round(integrityScore)}/100. ` : '';
  return `${intFrag}${flagLabels.length} structural credibility signal${flagLabels.length !== 1 ? 's' : ''}${flagLabels.length ? ': ' + flagLabels.join(', ').toLowerCase() : ''}.`;
}

// Convert a precomputed assessment row into the CredibilityCard shape.
// `trend` is intentionally omitted — the precompute scores ONE T3010 year
// (FY 2023). The card component handles a missing trend gracefully and just
// hides the time-series subblock.
function assessmentToCredibilityResult(a) {
  const flags = Array.isArray(a.ghostFlags) ? a.ghostFlags : [];
  const triggered = flags.map(f => INTEGRITY_RULES[f]).filter(Boolean);
  const integrityScore = typeof a.integrityConcernScore === 'number' ? a.integrityConcernScore : 0;
  const ghostScore = a.ghostScore ?? 0;
  return {
    orgId: a.organizationId,
    organization_name: a.entityCanonicalName || `entity_id ${a.organizationId}`,
    classification: classifyByIntegrity(integrityScore, ghostScore),
    pattern_score: Math.max(Math.round(integrityScore), ghostScore * 10),
    triggered_rules: triggered,
    years_of_data: 1,
    trend: null,
    explanation_text: buildExplanation(a.entityCanonicalName || `entity ${a.organizationId}`, flags, integrityScore),
  };
}

function SummaryPill({ label, count, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`text-3xl font-bold leading-none ${color}`}>{count}</span>
    </div>
  );
}

export default function CredibilityEngine() {
  const [filter, setFilter] = useState('All');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(100);

  // Fetch precomputed assessments sorted ghost_desc — the rows with the most
  // structural credibility concerns surface first.
  const { data: page, isLoading, isFetching, error } = useQuery({
    queryKey: ['assessments', 'credibility-page', { offset, limit }],
    queryFn: () => base44.entities.CapacityAssessments.listPage({
      sort: 'ghost_desc',
      limit,
      offset,
    }),
    placeholderData: keepPreviousData,
  });

  const assessments = page?.data ?? [];
  const meta = page?.meta;

  const results = useMemo(
    () => assessments.map(assessmentToCredibilityResult),
    [assessments],
  );

  const strongCount = results.filter(r => r.classification === 'Strong pattern signal').length;
  const modCount    = results.filter(r => r.classification === 'Moderate pattern concern').length;
  const clearCount  = results.filter(r => r.classification === 'No concerning pattern').length;

  const filtered = filter === 'All' ? results : results.filter(r => r.classification === filter);

  // Per-flag frequency on the current page.
  const ruleFrequency = useMemo(() => {
    const counts = {};
    Object.keys(INTEGRITY_RULES).forEach(id => { counts[id] = 0; });
    results.forEach(r => r.triggered_rules.forEach(rule => {
      counts[rule.id] = (counts[rule.id] || 0) + 1;
    }));
    return counts;
  }, [results]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Activity className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Credibility Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Surfaces structural credibility concerns across the precomputed pool — internal contradictions and integrity signals that distinguish a credible operating profile from one that doesn't add up.
            </p>
          </div>
        </div>
        <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-5 py-3">
          <p className="text-sm font-semibold text-primary">
            Does this organization's reported profile add up?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sourced from the precomputed pool across all {meta ? meta.total.toLocaleString() : '…'} assessments. Pattern score combines the engine's integrity-concern score (0–100) with the four ghost-flag mismatch signals; cards are paginated and sorted so the most-concerning entities surface first.
          </p>
        </div>
      </div>

      {/* Multi-year notice */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Single-year scope.</strong> The precompute scores each entity from its most recent T3010 + funding linkage (FY 2023). Multi-year trend analysis (sustained zero programs, declining program spend, funding-without-activity over time) requires a separate multi-year batch and is not yet wired into this view. To see year-by-year financial history for a specific entity, open its profile.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill label="On this page" count={results.length} color="text-foreground" />
        <SummaryPill label="Strong Signal" count={strongCount} color="text-red-600" />
        <SummaryPill label="Moderate Concern" count={modCount} color="text-yellow-600" />
        <SummaryPill label="No Pattern" count={clearCount} color="text-green-600" />
      </div>

      {/* Rule frequency on this page */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Credibility Signal Frequency · Current Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(INTEGRITY_RULES).map(([id, rule]) => {
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
                    <p className="text-[10px] text-muted-foreground">{rule.detail}</p>
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
          const style = getPatternStyle(cls);
          return (
            <button
              key={cls}
              onClick={() => setFilter(cls)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                isActive
                  ? `${style.bg} ${style.border} ${style.text} ring-2 ring-offset-1 ring-primary/30 font-semibold`
                  : 'border-border text-muted-foreground bg-card hover:bg-muted'
              }`}
            >
              {cls} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading / error states */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          Failed to load: {String(error.message ?? error)}
        </div>
      )}
      {isLoading && results.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading precomputed credibility signals…</p>
          </div>
        </div>
      )}

      {/* Results grid */}
      {!isLoading && filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No organizations match this filter on the current page.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(result => (
            <CredibilityCard key={result.orgId} result={result} orgId={result.orgId} />
          ))}
        </div>
      )}

      <PaginationBar
        meta={meta}
        loading={isFetching}
        onChange={({ offset: o, limit: l }) => { setOffset(o); setLimit(l); }}
      />

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important:</strong> Credibility signals reflect structural inconsistencies in the most recent reported data. They do not constitute evidence of fraud, misconduct, or intentional misrepresentation. All findings should be treated as prompts for reviewer inquiry — not as determinations of fact.
        </p>
      </div>
    </div>
  );
}
