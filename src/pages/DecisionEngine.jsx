import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Info, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { runDecisionEngine, getDecisionStyle } from '@/lib/decisionEngine';
import { runMismatchEngine, buildMismatchInput } from '@/lib/mismatchEngine';
import { runCredibilityEngine, buildCredibilityInput } from '@/lib/credibilityEngine';
import DecisionCard from '@/components/decisions/DecisionCard';

const CLASSIFICATIONS = ['All', 'High Concern', 'Overstretched', 'Underdeveloped', 'Healthy / Ready'];
const RISK_LEVELS = ['All', 'High', 'Moderate', 'Low'];

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

  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => base44.entities.Organizations.list(),
  });
  const { data: allFunding = [], isLoading: loadingFunding } = useQuery({
    queryKey: ['funding-all'],
    queryFn: () => base44.entities.FundingRecords.list(),
  });
  const { data: allFinancials = [], isLoading: loadingFin } = useQuery({
    queryKey: ['financials-all'],
    queryFn: () => base44.entities.FinancialIndicators.list(),
  });
  const { data: allAssessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => base44.entities.CapacityAssessments.list(),
  });

  const loading = loadingOrgs || loadingFunding || loadingFin;

  const results = useMemo(() => {
    // Build a map of latest assessment per org
    const latestAssessmentMap = {};
    allAssessments.forEach(a => {
      const prev = latestAssessmentMap[a.organizationId];
      if (!prev || new Date(a.assessmentDate) > new Date(prev.assessmentDate)) {
        latestAssessmentMap[a.organizationId] = a;
      }
    });

    return orgs.map(org => {
      const funding = allFunding.filter(f => f.organizationId === org.id);
      const financials = allFinancials.filter(f => f.organizationId === org.id);
      const latestAssessment = latestAssessmentMap[org.id];

      // Run mismatch engine
      const mismatchInput = buildMismatchInput(org, funding, financials);
      const mismatch = runMismatchEngine(mismatchInput);

      // Run credibility (pattern) engine
      const patternInput = buildCredibilityInput(financials);
      const pattern = runCredibilityEngine(org.organizationName, patternInput);

      // Run decision engine — include capacity score from stored assessment if available
      const decision = runDecisionEngine({
        organization_name: org.organizationName,
        mismatch_score: mismatch.mismatch_score,
        pattern_score: pattern.pattern_score,
        capacity_score: latestAssessment?.overallCapacityScore ?? null,
        mismatch_classification: mismatch.classification,
        pattern_classification: pattern.classification,
        triggered_mismatch_rules: mismatch.triggered_rules,
        triggered_pattern_rules: pattern.triggered_rules,
      });

      return { ...decision, orgId: org.id };
    }).sort((a, b) => {
      // Sort: High first, then by action_confidence desc
      const riskOrder = { High: 0, Moderate: 1, Low: 2 };
      const rDiff = (riskOrder[a.overall_risk_level] ?? 3) - (riskOrder[b.overall_risk_level] ?? 3);
      if (rDiff !== 0) return rDiff;
      return b.action_confidence - a.action_confidence;
    });
  }, [orgs, allFunding, allFinancials]);

  const highCount = results.filter(r => r.overall_risk_level === 'High').length;
  const modCount = results.filter(r => r.overall_risk_level === 'Moderate').length;
  const lowCount = results.filter(r => r.overall_risk_level === 'Low').length;
  const highConcernCount = results.filter(r => r.classification === 'High Concern').length;

  // Action distribution
  const actionCounts = useMemo(() => {
    const counts = {};
    results.forEach(r => {
      counts[r.recommended_action] = (counts[r.recommended_action] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [results]);

  const filtered = results.filter(r => {
    const matchClass = classFilter === 'All' || r.classification === classFilter;
    const matchRisk = riskFilter === 'All' || r.overall_risk_level === riskFilter;
    return matchClass && matchRisk;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Synthesizing signals into decisions…</p>
        </div>
      </div>
    );
  }

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
            Each recommendation combines mismatch signals (internal data inconsistencies) with pattern signals (multi-year trends) into a unified risk-informed action. Final decisions remain with human reviewers.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill label="Total Assessed" count={results.length} color="text-foreground" />
        <SummaryPill label="High Risk" count={highCount} color="text-red-600" />
        <SummaryPill label="Moderate Risk" count={modCount} color="text-yellow-600" />
        <SummaryPill label="Low Risk" count={lowCount} color="text-green-600" />
      </div>

      {/* Action distribution */}
      {actionCounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recommended Actions — Portfolio Distribution
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

      {/* Results grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No organizations match this filter.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(result => (
            <DecisionCard key={result.orgId} result={result} orgId={result.orgId} />
          ))}
        </div>
      )}

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