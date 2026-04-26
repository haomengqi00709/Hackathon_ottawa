import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Activity, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { runCredibilityEngine, buildCredibilityInput, getPatternStyle, CREDIBILITY_RULES } from '@/lib/credibilityEngine';
import CredibilityCard from '@/components/credibility/CredibilityCard';

const CLASSIFICATIONS = ['All', 'Strong pattern signal', 'Moderate pattern concern', 'No concerning pattern'];

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

  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => base44.entities.Organizations.list(),
  });
  const { data: allFinancials = [], isLoading: loadingFin } = useQuery({
    queryKey: ['financials-all'],
    queryFn: () => base44.entities.FinancialIndicators.list(),
  });

  const loading = loadingOrgs || loadingFin;

  const results = useMemo(() => {
    return orgs.map(org => {
      const financials = allFinancials.filter(f => f.organizationId === org.id);
      const yearlyRecords = buildCredibilityInput(financials);
      const result = runCredibilityEngine(org.organizationName, yearlyRecords);
      return { ...result, orgId: org.id };
    }).sort((a, b) => b.pattern_score - a.pattern_score);
  }, [orgs, allFinancials]);

  // Only include orgs with enough data for meaningful analysis
  const analyzed = results.filter(r => r.years_of_data >= 1);
  const insufficient = results.filter(r => r.years_of_data === 0);

  const strongCount = analyzed.filter(r => r.classification === 'Strong pattern signal').length;
  const modCount = analyzed.filter(r => r.classification === 'Moderate pattern concern').length;
  const clearCount = analyzed.filter(r => r.classification === 'No concerning pattern').length;

  const filtered = filter === 'All'
    ? analyzed
    : analyzed.filter(r => r.classification === filter);

  // Rule frequency
  const ruleFrequency = useMemo(() => {
    const counts = {};
    Object.keys(CREDIBILITY_RULES).forEach(id => { counts[id] = 0; });
    analyzed.forEach(r => r.triggered_rules.forEach(rule => { counts[rule.id] = (counts[rule.id] || 0) + 1; }));
    return counts;
  }, [analyzed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Analyzing multi-year patterns…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Activity className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pattern Over Time — Credibility Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analyzes multi-year financial data to detect sustained behavioral patterns, distinguishing one-off anomalies from consistent signals.
            </p>
          </div>
        </div>
        <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-5 py-3">
          <p className="text-sm font-semibold text-primary">
            Is this a one-time anomaly or a sustained pattern?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each rule requires data across multiple years. A pattern triggered once is informative — triggered repeatedly, it becomes a signal worth investigating.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill label="Analyzed" count={analyzed.length} color="text-foreground" />
        <SummaryPill label="Strong Signal" count={strongCount} color="text-red-600" />
        <SummaryPill label="Moderate Concern" count={modCount} color="text-yellow-600" />
        <SummaryPill label="No Pattern" count={clearCount} color="text-green-600" />
      </div>

      {/* Rule frequency breakdown */}
      {analyzed.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pattern Rule Frequency Across Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(CREDIBILITY_RULES).map(([id, rule]) => {
                const count = ruleFrequency[id] || 0;
                const pct = analyzed.length > 0 ? Math.round((count / analyzed.length) * 100) : 0;
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
            ? analyzed.length
            : analyzed.filter(r => r.classification === cls).length;
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

      {/* Results grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No organizations match this filter.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(result => (
            <CredibilityCard key={result.orgId} result={result} orgId={result.orgId} />
          ))}
        </div>
      )}

      {/* Insufficient data notice */}
      {insufficient.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong>{insufficient.length} organization{insufficient.length > 1 ? 's' : ''}</strong> could not be analyzed due to missing financial year records. Add fiscal year data via the Intake page to include them in pattern analysis.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important:</strong> Pattern signals reflect trends in submitted financial data only. They do not constitute evidence of fraud, misconduct, or intentional misrepresentation. All findings should be treated as prompts for reviewer inquiry — not as determinations of fact.
        </p>
      </div>
    </div>
  );
}