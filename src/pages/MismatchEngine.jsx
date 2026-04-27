import React, { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, ScanSearch, AlertTriangle, CheckCircle2, Minus, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getMismatchStyle } from '@/lib/mismatchEngine';
import MismatchCard from '@/components/mismatch/MismatchCard';
import PaginationBar from '@/components/PaginationBar';

const CLASSIFICATIONS = ['All', 'High mismatch', 'Moderate mismatch', 'No mismatch detected'];

// The precompute writes four ghost-flag signals on every assessment row.
// Each one IS a mismatch — a contradiction between two reported fields on the
// same T3010 / linkage record. The page renders these as the engine's
// triggered rules so the engine no longer relies on a 100-org sample.
const GHOST_FLAG_RULES = {
  NO_PAID_EMPLOYEES: {
    id: 'NO_PAID_EMPLOYEES',
    label: 'No paid employees',
    detail: 'The latest T3010 reports zero paid positions yet the entity is receiving public funding. Volunteers alone usually cannot deliver at the funding level observed.',
  },
  NEAR_TOTAL_GOVT_DEPENDENCY: {
    id: 'NEAR_TOTAL_GOVT_DEPENDENCY',
    label: 'Near-total government dependency',
    detail: 'Government revenue is ≥90% of total revenue. Single-funder concentration is a structural risk regardless of program legitimacy.',
  },
  NEAR_ZERO_PROGRAMS: {
    id: 'NEAR_ZERO_PROGRAMS',
    label: 'Near-zero program spend',
    detail: 'Program-delivery spending (T3010 field 5000) is ≤5% of total expenses. A heavily funded organization with negligible program activity is internally inconsistent.',
  },
  COMP_WITH_NO_EMPLOYEES: {
    id: 'COMP_WITH_NO_EMPLOYEES',
    label: 'Compensation paid without staff',
    detail: 'Total reported compensation exceeds $10K while the same filing reports zero employees. Compensation entries with no headcount is a mechanical contradiction.',
  },
};

function classifyByGhost(ghostScore) {
  if (ghostScore >= 7) return 'High mismatch';
  if (ghostScore >= 4) return 'Moderate mismatch';
  return 'No mismatch detected';
}

function buildExplanation(name, flags, score) {
  if (flags.length === 0) return `${name} shows no internal contradictions in the precomputed signals.`;
  const flagLabels = flags.map(f => GHOST_FLAG_RULES[f]?.label).filter(Boolean);
  return `${flagLabels.length} contradiction signal${flagLabels.length > 1 ? 's' : ''} triggered (ghost score ${score}/10): ${flagLabels.join(', ').toLowerCase()}.`;
}

// Convert a precomputed assessment row into the MismatchCard shape.
function assessmentToMismatchResult(a) {
  const ghost = a.ghostScore ?? 0;
  const flags = Array.isArray(a.ghostFlags) ? a.ghostFlags : [];
  const triggered = flags.map(f => GHOST_FLAG_RULES[f]).filter(Boolean);
  return {
    orgId: a.organizationId,
    organization_name: a.entityCanonicalName || `entity_id ${a.organizationId}`,
    classification: classifyByGhost(ghost),
    mismatch_score: ghost * 10, // 0–10 → 0–100
    triggered_rules: triggered,
    explanation_text: buildExplanation(a.entityCanonicalName || `entity ${a.organizationId}`, flags, ghost),
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

export default function MismatchEngine() {
  const [filter, setFilter] = useState('All');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(100);

  // Fetch a page of precomputed assessments sorted ghost_desc — the rows with
  // the most ghost flags surface first. Pagination meta carries the total
  // across the entire 851K precomputed pool.
  const { data: page, isLoading, isFetching, error } = useQuery({
    queryKey: ['assessments', 'mismatch-page', { offset, limit }],
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
    () => assessments.map(assessmentToMismatchResult),
    [assessments],
  );

  const highCount = results.filter(r => r.classification === 'High mismatch').length;
  const modCount  = results.filter(r => r.classification === 'Moderate mismatch').length;
  const noneCount = results.filter(r => r.classification === 'No mismatch detected').length;

  const filtered = filter === 'All' ? results : results.filter(r => r.classification === filter);

  // Per-flag frequency on the current page.
  const ruleFrequency = useMemo(() => {
    const counts = {};
    Object.keys(GHOST_FLAG_RULES).forEach(id => { counts[id] = 0; });
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
          <ScanSearch className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mismatch Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Detects internal contradictions in submitted organizational data — fields that disagree with each other on the same filing.
            </p>
          </div>
        </div>
        <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-5 py-3">
          <p className="text-sm font-semibold text-primary">
            Is what this organization reports internally consistent?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sourced from the precomputed pool across all {meta ? meta.total.toLocaleString() : '…'} assessments. Each card carries the four mismatch signals checked against every entity's most recent T3010 + funding linkage; cards are paginated and sorted by ghost-flag count, so the most contradictory entities surface first.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill label="On this page" count={results.length} color="text-foreground" />
        <SummaryPill label="High Mismatch" count={highCount} color="text-red-600" />
        <SummaryPill label="Moderate Mismatch" count={modCount} color="text-yellow-600" />
        <SummaryPill label="No Mismatch" count={noneCount} color="text-green-600" />
      </div>

      {/* Rule frequency on this page */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Mismatch Signal Frequency · Current Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(GHOST_FLAG_RULES).map(([id, rule]) => {
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
            <p className="text-sm text-muted-foreground">Loading precomputed mismatch signals…</p>
          </div>
        </div>
      )}

      {/* Results grid */}
      {!isLoading && filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ScanSearch className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No organizations match this filter on the current page.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(result => (
            <MismatchCard key={result.orgId} result={result} orgId={result.orgId} />
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
          <strong>Important:</strong> Mismatch signals reflect internal data contradictions in the latest filing only. They do not constitute evidence of fraud, misconduct, or intentional misrepresentation. All findings should be treated as prompts for reviewer inquiry — not as determinations of fact.
        </p>
      </div>
    </div>
  );
}
