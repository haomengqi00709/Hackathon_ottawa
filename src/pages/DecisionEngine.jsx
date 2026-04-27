import React, { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { reqEnvelope } from '@/api/httpClient';
import { Loader2, Info, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getDecisionStyle } from '@/lib/decisionEngine';
import { RISK_NATURE_CONFIG } from '@/lib/scoringEngine';
import DecisionCard from '@/components/decisions/DecisionCard';
import PaginationBar from '@/components/PaginationBar';

const CLASSIFICATIONS = ['All', 'High Concern', 'Overstretched', 'Underdeveloped', 'Healthy / Ready'];
const RISK_LEVELS = ['All', 'High', 'Moderate', 'Low'];

// Map the precomputed riskNature directly onto the decision engine's
// classification labels. The risk nature IS the engine output for the
// 851K-entity precomputed pool — there's no need to re-derive a class via
// the live runDecisionEngine() composite formula.
const NATURE_TO_CLASS = {
  'Ready': 'Healthy / Ready',
  'Emerging but Underdeveloped': 'Underdeveloped',
  'Overstretched / Request Exceeds Capacity': 'Overstretched',
  'High Concern / Enhanced Due Diligence Required': 'High Concern',
};

const RISK_LEVEL_LABEL = { low: 'Low', moderate: 'Moderate', high: 'High' };

const CLASSIFICATION_TEMPLATE = {
  'Healthy / Ready':
    'The organization\'s precomputed signals indicate operational capacity proportionate to observed funding. No active mismatch or risk-nature concerns.',
  'Underdeveloped':
    'Mission-aligned but capacity does not yet support the funding scale observed. A staged or capacity-building track is appropriate.',
  'Overstretched':
    'The organization appears active, but operational capacity is materially below what the funding scale would imply. Milestone-based funding is appropriate.',
  'High Concern':
    'Multiple mismatch signals combine with elevated integrity concern. Enhanced due diligence is required before any further determination.',
};

// Convert a precomputed assessment row into the DecisionCard shape.
function assessmentToDecisionResult(a) {
  const ghost = a.ghostScore ?? 0;
  const flags = Array.isArray(a.ghostFlags) ? a.ghostFlags : [];
  const classification = NATURE_TO_CLASS[a.riskNature] || 'Underdeveloped';
  const overall_risk_level = RISK_LEVEL_LABEL[a.riskLevel] || 'Moderate';
  const recommended_action =
    a.recommendedFundingPath || RISK_NATURE_CONFIG[a.riskNature]?.recommendedPath || 'Request more evidence';

  // Composite risk score uses the precomputed integrity-concern as the
  // anchor — that's what the scoring engine derives from ghost flags +
  // capacity signals. action_confidence echoes it (capped at 100).
  const composite = Math.min(100, Math.round(a.integrityConcernScore ?? 0));

  // Explanation pulls real per-row signals from the precompute output so the
  // card explains why THIS entity landed where it did.
  const parts = [CLASSIFICATION_TEMPLATE[classification]];
  if (typeof a.overallCapacityScore === 'number') {
    const cs = a.overallCapacityScore;
    const capLabel = cs >= 68 ? 'low concern' : cs >= 40 ? 'moderate concern' : 'high concern';
    parts.push(`Capacity score: ${cs}/100 (${capLabel}).`);
  }
  if (flags.length > 0) {
    parts.push(`Ghost-mismatch signals: ${flags.length}/4 triggered (${flags.slice(0, 3).join(', ')}${flags.length > 3 ? '…' : ''}).`);
  }
  parts.push(`Recommended action: ${recommended_action}.`);

  return {
    orgId: a.organizationId,
    organization_name: a.entityCanonicalName || `entity_id ${a.organizationId}`,
    classification,
    overall_risk_level,
    capacity_score: a.overallCapacityScore ?? null,
    mismatch_score: ghost * 10,
    pattern_score: typeof a.integrityConcernScore === 'number' ? Math.round(a.integrityConcernScore) : 0,
    composite_risk_score: composite,
    recommended_action,
    action_confidence: composite,
    explanation_text: parts.join(' '),
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

export default function DecisionEngine() {
  const [classFilter, setClassFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(100);

  // Fetch a page of precomputed assessments sorted score_asc — the entities
  // with the lowest capacity scores (highest concern under the engine's
  // composite formula) surface first. Pagination meta carries the total
  // across the entire 851K precomputed pool.
  const { data: page, isLoading, isFetching, error } = useQuery({
    queryKey: ['assessments', 'decision-page', { offset, limit }],
    queryFn: () => base44.entities.CapacityAssessments.listPage({
      sort: 'score_asc',
      limit,
      offset,
    }),
    placeholderData: keepPreviousData,
  });

  // Aggregate stats — used for the summary header so users see warehouse-wide
  // counts even when only one page is rendered.
  const { data: stats } = useQuery({
    queryKey: ['assessments', 'stats'],
    queryFn: async () => {
      const { data } = await reqEnvelope('/api/assessments/stats');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const assessments = page?.data ?? [];
  const meta = page?.meta;

  const results = useMemo(
    () => assessments.map(assessmentToDecisionResult),
    [assessments],
  );

  // Page-local counts for the filter pills.
  const filtered = results.filter(r => {
    const matchClass = classFilter === 'All' || r.classification === classFilter;
    const matchRisk = riskFilter === 'All' || r.overall_risk_level === riskFilter;
    return matchClass && matchRisk;
  });

  // Aggregate counts (warehouse-wide) — drive the summary pills.
  const aggHighRisk = stats?.byRiskLevel?.high ?? 0;
  const aggModRisk  = stats?.byRiskLevel?.moderate ?? 0;
  const aggLowRisk  = stats?.byRiskLevel?.low ?? 0;
  const aggHighConcern = stats?.byRiskNature?.['High Concern / Enhanced Due Diligence Required'] ?? 0;
  const aggOverstretched = stats?.byRiskNature?.['Overstretched / Request Exceeds Capacity'] ?? 0;
  const aggUnderdeveloped = stats?.byRiskNature?.['Emerging but Underdeveloped'] ?? 0;
  const aggReady = stats?.byRiskNature?.['Ready'] ?? 0;

  // Action distribution on the visible page.
  const actionCounts = useMemo(() => {
    const counts = {};
    results.forEach(r => {
      counts[r.recommended_action] = (counts[r.recommended_action] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [results]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Zap className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Action Layer — Decision Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Translates analytical signals into clear, actionable recommendations for government decision-makers.
            </p>
          </div>
        </div>
        <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-5 py-3">
          <p className="text-sm font-semibold text-primary">
            We move from detection to decision by translating data signals into clear, actionable guidance.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sourced from the precomputed pool across all {meta ? meta.total.toLocaleString() : '…'} assessments. Capacity, mismatch, and integrity-concern signals are pulled per row from the engine's own scoring; cards are paginated and sorted by capacity-score ascending so the most concerning entities surface first.
          </p>
        </div>
      </div>

      {/* Summary stats — warehouse-wide aggregates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill label="Total Assessed" count={stats ? stats.total.toLocaleString() : '…'} color="text-foreground" />
        <SummaryPill label="High Risk" count={stats ? aggHighRisk.toLocaleString() : '…'} color="text-red-600" />
        <SummaryPill label="Moderate Risk" count={stats ? aggModRisk.toLocaleString() : '…'} color="text-yellow-600" />
        <SummaryPill label="Low Risk" count={stats ? aggLowRisk.toLocaleString() : '…'} color="text-green-600" />
      </div>

      {/* Risk-Nature distribution row — pulled from byRiskNature aggregate */}
      {stats?.byRiskNature && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Risk-Nature Distribution · Across All Stored Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: 'Ready',             label: 'Healthy / Ready',  count: aggReady },
                { key: 'Underdeveloped',    label: 'Underdeveloped',   count: aggUnderdeveloped },
                { key: 'Overstretched',     label: 'Overstretched',    count: aggOverstretched },
                { key: 'High Concern',      label: 'High Concern',     count: aggHighConcern },
              ].map(({ key, label, count }) => {
                const cs = NATURE_TO_CLASS[
                  key === 'Ready' ? 'Ready'
                  : key === 'Underdeveloped' ? 'Emerging but Underdeveloped'
                  : key === 'Overstretched' ? 'Overstretched / Request Exceeds Capacity'
                  : 'High Concern / Enhanced Due Diligence Required'
                ];
                const style = getDecisionStyle(cs);
                return (
                  <div key={key} className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{style.emoji}</span>
                      <span className={`text-2xl font-bold ${style.color}`}>{count.toLocaleString()}</span>
                    </div>
                    <p className={`text-xs font-semibold leading-snug ${style.color}`}>{label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action distribution on this page */}
      {actionCounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recommended Actions · Current Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionCounts.map(([action, count]) => {
              const pct = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
              return (
                <div key={action} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{action}</span>
                    <span className="text-muted-foreground tabular-nums">{count} org{count !== 1 ? 's' : ''} · {pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 50 ? 'bg-red-400' : pct >= 25 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="space-y-2">
        {/* Classification filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">Classification:</span>
          {CLASSIFICATIONS.map(cls => {
            const count = cls === 'All' ? results.length : results.filter(r => r.classification === cls).length;
            const style = getDecisionStyle(cls);
            const isActive = classFilter === cls;
            return (
              <button
                key={cls}
                onClick={() => setClassFilter(cls)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? `${style.bg} ${style.border} ${style.color} ring-2 ring-offset-1 ring-primary/30 font-semibold`
                    : 'border-border text-muted-foreground bg-card hover:bg-muted'
                }`}
              >
                {cls === 'All' ? `All (${count})` : `${style.emoji} ${cls} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Risk filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">Risk Level:</span>
          {RISK_LEVELS.map(level => {
            const count = level === 'All' ? results.length : results.filter(r => r.overall_risk_level === level).length;
            const isActive = riskFilter === level;
            const colors = {
              All: 'border-border text-muted-foreground',
              High: 'border-red-300 text-red-700 bg-red-50',
              Moderate: 'border-yellow-300 text-yellow-700 bg-yellow-50',
              Low: 'border-green-300 text-green-700 bg-green-50',
            };
            return (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? `${colors[level]} ring-2 ring-offset-1 ring-primary/30 font-semibold`
                    : 'border-border text-muted-foreground bg-card hover:bg-muted'
                }`}
              >
                {level} ({count})
              </button>
            );
          })}
        </div>
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
            <p className="text-sm text-muted-foreground">Loading precomputed decisions…</p>
          </div>
        </div>
      )}

      {/* Results grid */}
      {!isLoading && filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No organizations match this filter on the current page.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(result => (
            <DecisionCard key={result.orgId} result={result} orgId={result.orgId} />
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
          <strong>Risk-Informed Decision Support:</strong> All recommendations generated by this engine are advisory in nature and are intended to assist — not replace — professional judgment. No output constitutes a determination of fraud, misconduct, or legal non-compliance. Final funding decisions must be made by authorized human reviewers and recorded with appropriate documentation.
        </p>
      </div>
    </div>
  );
}
