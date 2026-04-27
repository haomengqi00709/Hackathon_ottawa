import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchOrgsStats, reqEnvelope } from '@/api/httpClient';
async function fetchAssessmentStats() {
  const { data } = await reqEnvelope('/api/assessments/stats');
  return data;
}
import { Link } from 'react-router-dom';
import {
  Building2, AlertTriangle, CheckCircle2, ClipboardCheck,
  ArrowRight, TrendingDown, Lightbulb, ChevronRight, Database, Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import RiskBadge from '@/components/shared/RiskBadge';
import RiskNatureBadge from '@/components/shared/RiskNatureBadge';
import DemoSpotlight from '@/components/dashboard/DemoSpotlight';
import { RISK_NATURE_CONFIG } from '@/lib/scoringEngine';

function StatPill({ title, value, sub, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      <span className={`text-3xl font-bold leading-none ${color || 'text-foreground'}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function deriveInsights({ orgs, latest, highCount, modCount, reviewQueue, avgScore, orgMap, stats }) {
  const insights = [];

  // Insight 1: High-risk count and what it means
  if (highCount > 0) {
    const names = latest
      .filter(a => a.riskLevel === 'high')
      .sort((a, b) => a.overallCapacityScore - b.overallCapacityScore)
      .slice(0, 2)
      .map(a => orgMap[a.organizationId]?.organizationName || 'Unknown')
      .join(' and ');
    insights.push({
      severity: 'high',
      label: 'Reviewer Action Required',
      text: `${highCount} recipient organization${highCount > 1 ? 's' : ''} scored below 40, indicating a material discrepancy between funding levels and observable operational capacity. ${names ? `Refer for review: ${names}.` : ''}`
    });
  } else if (modCount > 0) {
    insights.push({
      severity: 'moderate',
      label: 'Moderate Concern Identified',
      text: `No organizations currently meet the threshold for high-concern classification. However, ${modCount} present indicators warranting closer monitoring ahead of renewal decisions.`
    });
  } else {
    insights.push({
      severity: 'low',
      label: 'No Active Concerns',
      text: `All assessed organizations fall within the low-concern band. No capacity indicators requiring immediate attention have been identified.`
    });
  }

  // Insight 2: Review queue urgency
  if (reviewQueue > 0) {
    insights.push({
      severity: reviewQueue >= 3 ? 'moderate' : 'low',
      label: 'Pending Reviewer Actions',
      text: `${reviewQueue} assessment${reviewQueue > 1 ? 's' : ''} ${reviewQueue > 1 ? 'are' : 'is'} awaiting formal reviewer sign-off. Decisions should be recorded prior to the next funding determination.`
    });
  } else {
    insights.push({
      severity: 'low',
      label: 'Review Workflow Current',
      text: 'All flagged assessments have received a recorded reviewer decision. No outstanding actions are pending.'
    });
  }

  // Insight 3: Portfolio average and coverage. Coverage now compared against
  // the real warehouse total (stats.totalEntities), not the page sample.
  const assessed = latest.length;
  const universeSize = stats?.totalEntities;
  if (universeSize && assessed < universeSize) {
    const unassessed = universeSize - assessed;
    insights.push({
      severity: 'moderate',
      label: 'Assessment Coverage Incomplete',
      text:
        `${assessed.toLocaleString()} of ${universeSize.toLocaleString()} indexed entities have a recorded ` +
        `capacity assessment. Use the warehouse-driven Funding-Integrity probes ` +
        `(Loops, Cross-Source, Amendments, etc.) for cross-portfolio analysis without per-entity assessments.`,
    });
  } else if (avgScore > 0) {
    insights.push({
      severity: avgScore >= 68 ? 'low' : avgScore >= 40 ? 'moderate' : 'high',
      label: 'Portfolio Average Score',
      text: `The mean capacity score across all ${assessed} assessed organizations is ${avgScore}/100. ${
        avgScore >= 68
          ? 'The overall portfolio demonstrates sufficient operational capacity relative to stated commitments.'
          : avgScore >= 40
          ? 'The portfolio average falls within the moderate-concern range. A systemic review of benchmarks or recipient profiles may be warranted.'
          : 'The portfolio average falls within the high-concern range, suggesting capacity shortfalls across multiple recipient organizations.'
      }`
    });
  }

  return insights.slice(0, 3);
}

const insightStyle = {
  high:     { bar: 'bg-red-500',    icon: AlertTriangle,  iconClass: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  moderate: { bar: 'bg-yellow-400', icon: TrendingDown,   iconClass: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  low:      { bar: 'bg-green-500',  icon: CheckCircle2,   iconClass: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
};

const fmtCAD = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(n));

// Pulls top-15 ghost-scored charities directly from the warehouse via
// /api/named/ghost_top. Independent of the reviewer-driven assessments table —
// always shows real data even when zero assessments have been run.
function WarehouseHotList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'warehouse-hot-list'],
    queryFn: () => reqEnvelope('/api/named/ghost_top?limit=15'),
    staleTime: 5 * 60 * 1000,
  });
  const rows = data?.data?.rows ?? data?.rows ?? [];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Warehouse Top Ghost-Scored Charities
          <span className="text-[10px] text-muted-foreground italic font-normal">— live from the data, not from reviewer assessments</span>
        </CardTitle>
        <Link to="/loops">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
            See loops <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="px-4 py-6 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading from cra.govt_funding_by_charity ⨝ cra.cra_compensation…
          </div>
        )}
        {error && (
          <div className="px-4 py-6 text-xs text-red-600">
            Failed to load: {String(error.message ?? error)}
          </div>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <p className="px-4 py-6 text-xs text-muted-foreground italic">No data returned.</p>
        )}
        {!isLoading && !error && rows.length > 0 && (
          <div className="divide-y divide-border">
            {rows.map((r, i) => {
              const score = Number(r.ghost_score);
              const scoreColor = score >= 8 ? 'text-red-600' : score >= 5 ? 'text-orange-500' : 'text-muted-foreground';
              const Wrap = r.entity_id ? Link : 'div';
              const wrapProps = r.entity_id
                ? { to: `/organizations/${r.entity_id}` }
                : {};
              return (
                <Wrap
                  {...wrapProps}
                  key={r.bn || i}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors group"
                >
                  <span className="text-xs text-muted-foreground w-4 font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {r.legal_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      BN {r.bn} · {r.province ?? '—'} · {Number(r.employees) === 0 ? '0 employees ⚠' : `${Number(r.employees).toLocaleString()} employees`} · {fmtCAD(r.govt_revenue)} govt revenue
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">prog</span>
                    <span className={`text-xs tabular-nums ${Number(r.programs_pct) < 10 ? 'text-red-600 font-semibold' : ''}`}>
                      {r.programs_pct != null ? `${Number(r.programs_pct).toFixed(0)}%` : '—'}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">govt</span>
                    <span className={`text-xs tabular-nums ${Number(r.govt_share_of_rev) >= 90 ? 'text-red-600 font-semibold' : ''}`}>
                      {r.govt_share_of_rev != null ? `${Math.round(Number(r.govt_share_of_rev))}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xl font-bold tabular-nums ${scoreColor}`}>{score}</span>
                    <span className="text-[10px] text-muted-foreground">/10</span>
                    {r.entity_id && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </Wrap>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  // Aggregate stats across the whole 851K-entity universe — no list pulled.
  const { data: stats } = useQuery({ queryKey: ['orgs', 'stats'], queryFn: fetchOrgsStats });
  const { data: assessmentStats } = useQuery({
    queryKey: ['assessments', 'stats'],
    queryFn: fetchAssessmentStats,
  });
  // Recent orgs sample (default first page, 200 rows) — purely for surfacing
  // org-type/jurisdiction in the "Top Flagged" panel. Names come from
  // assessment.entityCanonicalName which is denormalized on every row.
  const { data: orgs = [] } = useQuery({ queryKey: ['orgs', 'sample'], queryFn: () => base44.entities.Organizations.list() });
  const { data: assessments = [] } = useQuery({ queryKey: ['assessments'], queryFn: () => base44.entities.CapacityAssessments.list() });

  // Per-band server samples for both the Top Flagged list and the Score
  // Spread bar chart. Fetched unconditionally so the chart always shows the
  // shape of the distribution across the 851K precomputed pool, not a single
  // tier of newest-inserted rows.
  const { data: highRiskPage } = useQuery({
    queryKey: ['assessments', 'sample', 'high'],
    queryFn: () => base44.entities.CapacityAssessments.filter({ riskLevel: 'high', limit: 10 }),
  });
  const { data: modRiskPage } = useQuery({
    queryKey: ['assessments', 'sample', 'moderate'],
    queryFn: () => base44.entities.CapacityAssessments.filter({ riskLevel: 'moderate', limit: 10 }),
  });
  const { data: lowRiskPage } = useQuery({
    queryKey: ['assessments', 'sample', 'low'],
    queryFn: () => base44.entities.CapacityAssessments.filter({ riskLevel: 'low', limit: 10 }),
  });

  const latestMap = {};
  assessments.forEach(a => {
    if (!latestMap[a.organizationId] || new Date(a.assessmentDate) > new Date(latestMap[a.organizationId].assessmentDate)) {
      latestMap[a.organizationId] = a;
    }
  });
  const latest = Object.values(latestMap);

  const orgMap = {};
  orgs.forEach(o => { orgMap[o.id] = o; });

  // Prefer aggregated stats from the warehouse-precomputed assessment pool
  // (auto-v1) when available — that's authoritative across all 851K entities.
  // Fall back to the visible page of reviewer assessments when the batch
  // hasn't been run yet.
  const aggLow      = assessmentStats?.byRiskLevel?.low      ?? null;
  const aggModerate = assessmentStats?.byRiskLevel?.moderate ?? null;
  const aggHigh     = assessmentStats?.byRiskLevel?.high     ?? null;
  const usingAggregate = assessmentStats != null && assessmentStats.total > 0;

  const highCount = aggHigh ?? latest.filter(a => a.riskLevel === 'high').length;
  const modCount  = aggModerate ?? latest.filter(a => a.riskLevel === 'moderate').length;
  const lowCount  = aggLow ?? latest.filter(a => a.riskLevel === 'low').length;
  const reviewQueue = latest.filter(a => a.reviewerStatus === 'pending' || a.reviewerStatus === 'needs_review').length;
  const avgScore = latest.length > 0
    ? Math.round(latest.reduce((s, a) => s + (a.overallCapacityScore || 0), 0) / latest.length)
    : 0;

  const pieData = [
    { name: 'Low Concern',   value: lowCount,  color: '#22c55e' },
    { name: 'Moderate',      value: modCount,  color: '#eab308' },
    { name: 'High Concern',  value: highCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Prefer real high-risk rows from server. If there are none, fall back to
  // moderate. Only as a last resort fall back to the in-page assessments.
  const serverFlagged = (Array.isArray(highRiskPage) && highRiskPage.length)
    ? highRiskPage
    : (Array.isArray(modRiskPage) && modRiskPage.length ? modRiskPage : null);
  const topFlagged = (serverFlagged ?? latest)
    .filter(a => a.riskLevel === 'high' || a.riskLevel === 'moderate')
    .sort((a, b) => (a.overallCapacityScore ?? 100) - (b.overallCapacityScore ?? 100))
    .slice(0, 6);

  const insights = deriveInsights({ orgs, latest, highCount, modCount, reviewQueue, avgScore, orgMap, stats });

  // Stratified sample for the Score Spread bar chart: combine high + moderate
  // + low pages so the chart actually shows the distribution shape across the
  // 851K precomputed pool, not a single tier of newest-inserted rows. Tooltip
  // reads entityCanonicalName from the assessment row directly (same fix as
  // Top Flagged) so bars display real names instead of "Unknown".
  const stratifiedForBar = [
    ...(Array.isArray(highRiskPage) ? highRiskPage : []),
    ...(Array.isArray(modRiskPage) ? modRiskPage : []),
    ...(Array.isArray(lowRiskPage) ? lowRiskPage : []),
  ];
  const sortedForBar = (stratifiedForBar.length > 0 ? stratifiedForBar : latest)
    .filter((a) => typeof a.overallCapacityScore === 'number')
    .sort((a, b) => a.overallCapacityScore - b.overallCapacityScore);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Capacity Assessment Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Structured monitoring of recipient organizational capacity relative to funding commitments and stated deliverables</p>
          </div>
          <p className="text-xs text-muted-foreground sm:text-right flex-shrink-0">
            {assessmentStats
              ? `${assessmentStats.total.toLocaleString()} assessments stored`
              : `${latest.length.toLocaleString()} on this page`}
            {stats ? ` · ${stats.totalEntities.toLocaleString()} entities indexed` : ''}
          </p>
        </div>
        {/* Anchor question */}
        <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-5 py-4">
          <p className="text-base font-semibold text-primary leading-snug">
            Does this organization have the capacity to deliver what it was funded to do?
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Every score, indicator, and finding below is structured to help answer that question — objectively, consistently, and with a documented audit trail.
          </p>
        </div>
      </div>

      {/* Demo Spotlight */}
      <DemoSpotlight />

      {/* Executive Insights */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portfolio Summary</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {insights.map((ins, i) => {
              const style = insightStyle[ins.severity];
              const Icon = style.icon;
              return (
                <div key={i} className={`relative rounded-xl border p-4 overflow-hidden ${style.bg}`}>
                  <div className={`absolute top-0 left-0 h-full w-1 ${style.bar}`} />
                  <div className="pl-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${style.iconClass}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${style.iconClass}`}>{ins.label}</span>
                    </div>
                    <p className="text-sm leading-snug text-foreground">{ins.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Row — top row is warehouse-wide truth (851K entities), second row is reviewer activity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill
          title="Total Entities"
          value={stats ? stats.totalEntities.toLocaleString() : '…'}
          sub={stats ? `${stats.withBnRoot.toLocaleString()} with BN root` : 'across cra + fed + ab + user-added'}
          color="text-foreground"
        />
        <StatPill
          title="CRA-Linked"
          value={stats ? stats.craLinked.toLocaleString() : '…'}
          sub={stats ? `${stats.charityTyped.toLocaleString()} typed as charity/foundation` : 'linked to a T3010 filing'}
          color="text-blue-600"
        />
        <StatPill
          title="Multi-Source Recipients"
          value={stats ? stats.multiSource.toLocaleString() : '…'}
          sub="present in ≥ 2 datasets"
          color="text-purple-600"
        />
        <StatPill
          title="AB Provincial Linked"
          value={stats ? stats.abLinked.toLocaleString() : '…'}
          sub={stats ? `${stats.fedLinked.toLocaleString()} federal-linked` : ''}
          color="text-orange-600"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatPill
          title="Assessments Stored"
          value={assessmentStats ? assessmentStats.total.toLocaleString() : latest.length.toLocaleString()}
          sub={assessmentStats?.byVersion?.['auto-v1']
            ? `${assessmentStats.byVersion['auto-v1'].toLocaleString()} batch · ${(assessmentStats.total - assessmentStats.byVersion['auto-v1']).toLocaleString()} reviewer`
            : 'reviewer-driven'}
        />
        <StatPill title="Avg. Score" value={avgScore > 0 ? avgScore : '–'} sub="out of 100"
          color={avgScore >= 68 ? 'text-green-600' : avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'} />
        <StatPill
          title="Low Concern"
          value={typeof lowCount === 'number' ? lowCount.toLocaleString() : lowCount}
          sub={usingAggregate ? 'across all stored assessments' : 'on this page'}
          color="text-green-600"
        />
        <StatPill
          title="Moderate"
          value={typeof modCount === 'number' ? modCount.toLocaleString() : modCount}
          sub={usingAggregate ? 'across all stored assessments' : 'on this page'}
          color="text-yellow-600"
        />
        <StatPill
          title="High Concern"
          value={typeof highCount === 'number' ? highCount.toLocaleString() : highCount}
          sub={usingAggregate ? 'across all stored assessments' : 'on this page'}
          color="text-red-600"
        />
      </div>

      {/* Risk Nature Breakdown — prefer the warehouse-wide byRiskNature
          aggregate (across all 851K precomputed rows). Fall back to the page
          sample only when stats haven't loaded or the batch hasn't run. */}
      {(() => {
        const natures = ['Ready', 'Emerging but Underdeveloped', 'Overstretched / Request Exceeds Capacity', 'High Concern / Enhanced Due Diligence Required'];
        const aggregate = assessmentStats?.byRiskNature;
        const useAggregate = aggregate && Object.values(aggregate).some(v => v > 0);
        const counts = {};
        natures.forEach(n => {
          counts[n] = useAggregate
            ? (aggregate[n] ?? 0)
            : latest.filter(a => a.riskNature === n).length;
        });
        const anyCount = natures.some(n => counts[n] > 0);
        if (!anyCount) return null;
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Risk Nature Breakdown</h2>
              <span className="text-xs text-muted-foreground">
                — What kind of risk is this?
                {useAggregate && (
                  <span className="ml-1 italic">across all {assessmentStats.total.toLocaleString()} stored assessments</span>
                )}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {natures.map(n => {
                const cfg = RISK_NATURE_CONFIG[n];
                const count = counts[n];
                return (
                  <div key={n} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{cfg.emoji}</span>
                      <span className={`text-2xl font-bold ${cfg.color}`}>{count.toLocaleString()}</span>
                    </div>
                    <p className={`text-xs font-semibold leading-snug ${cfg.color}`}>{n}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Charts + Queue */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Risk distribution donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground flex-1">{d.name}</span>
                      <span className="font-bold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">No assessments yet</p>
            )}
          </CardContent>
        </Card>

        {/* Score bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Score Spread</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedForBar.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={sortedForBar} barCategoryGap="20%">
                  <XAxis dataKey="organizationId" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const a = payload[0].payload;
                      const displayName =
                        a.entityCanonicalName ||
                        orgMap[a.organizationId]?.organizationName ||
                        `entity_id ${a.organizationId}`;
                      return (
                        <div className="bg-card border rounded-lg shadow-lg p-2 text-xs max-w-[160px]">
                          <p className="font-semibold leading-snug">{displayName}</p>
                          <p className="text-muted-foreground">Score: <strong>{a.overallCapacityScore}</strong></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="overallCapacityScore" radius={[3, 3, 0, 0]}>
                    {sortedForBar.map((a, i) => (
                      <Cell key={i} fill={
                        a.overallCapacityScore >= 68 ? '#22c55e' :
                        a.overallCapacityScore >= 40 ? '#eab308' : '#ef4444'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">No assessments yet</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">Each bar = one organization, sorted by score ascending</p>
          </CardContent>
        </Card>

        {/* Review queue */}
        <Card className={reviewQueue > 0 ? 'border-yellow-200 bg-yellow-50/40' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Review Queue</span>
              <ClipboardCheck className={`w-4 h-4 ${reviewQueue > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4 gap-3">
            <div className={`text-5xl font-bold ${reviewQueue > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {reviewQueue}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {reviewQueue > 0
                ? 'assessment(s) awaiting human validation'
                : 'All assessments are reviewed and current'}
            </p>
            <Link to="/review-queue" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                Open Review Queue <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Hot List — always shows real data, even with zero
          reviewer-driven assessments */}
      <WarehouseHotList />

      {/* Top Flagged Organizations */}
      {topFlagged.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Organizations Requiring Attention
            </CardTitle>
            <Link to="/review-queue">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {topFlagged.map((a, idx) => {
                const org = orgMap[a.organizationId];
                // Each assessment row carries entity_canonical_name denormalized,
                // so we don't need to find the org in orgMap (which only has the
                // top-200 by source_count and almost never overlaps with the
                // high-risk precomputed rows).
                const displayName =
                  a.entityCanonicalName || org?.organizationName || `entity_id ${a.organizationId}`;
                const subline = org?.organizationType
                  ? `${org.organizationType} · ${org.jurisdiction ?? '—'}`
                  : (a.bnRoot ? `BN ${a.bnRoot}` : 'No CRA filing');
                const score = a.overallCapacityScore;
                const scoreColor =
                  score >= 68 ? 'text-green-600' :
                  score >= 40 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <Link
                    key={a.id}
                    to={`/organizations/${a.organizationId}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors group"
                  >
                    <span className="text-xs text-muted-foreground w-4 font-mono">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {subline}
                      </p>
                    </div>
                    {a.aiSummary && (
                      <p className="hidden md:block text-xs text-muted-foreground max-w-xs truncate flex-1">
                        {a.aiSummary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xl font-bold tabular-nums ${scoreColor}`}>{score}</span>
                      <RiskBadge level={a.riskLevel} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        <strong>Notice:</strong> Capacity assessments are generated from structured indicators and available evidence. They are intended to support — not replace — professional judgment. No assessment constitutes a determination of misconduct, fraud, or legal non-compliance. All cases requiring action must receive a documented reviewer decision prior to any funding determination.
      </p>
    </div>
  );
}