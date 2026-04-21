import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Building2, AlertTriangle, CheckCircle2, ClipboardCheck,
  ArrowRight, TrendingDown, Lightbulb, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import RiskBadge from '@/components/shared/RiskBadge';

function StatPill({ title, value, sub, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      <span className={`text-3xl font-bold leading-none ${color || 'text-foreground'}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function deriveInsights({ orgs, latest, highCount, modCount, reviewQueue, avgScore, orgMap }) {
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

  // Insight 3: Portfolio average and coverage
  const assessed = latest.length;
  const unassessed = orgs.length - assessed;
  if (unassessed > 0) {
    insights.push({
      severity: 'moderate',
      label: 'Assessment Coverage Incomplete',
      text: `${unassessed} of ${orgs.length} registered organizations have not yet been assessed. Gaps in coverage limit the reliability of portfolio-level reporting.`
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

export default function Dashboard() {
  const { data: orgs = [] } = useQuery({ queryKey: ['orgs'], queryFn: () => base44.entities.Organizations.list() });
  const { data: assessments = [] } = useQuery({ queryKey: ['assessments'], queryFn: () => base44.entities.CapacityAssessments.list() });

  const latestMap = {};
  assessments.forEach(a => {
    if (!latestMap[a.organizationId] || new Date(a.assessmentDate) > new Date(latestMap[a.organizationId].assessmentDate)) {
      latestMap[a.organizationId] = a;
    }
  });
  const latest = Object.values(latestMap);

  const orgMap = {};
  orgs.forEach(o => { orgMap[o.id] = o; });

  const highCount = latest.filter(a => a.riskLevel === 'high').length;
  const modCount  = latest.filter(a => a.riskLevel === 'moderate').length;
  const lowCount  = latest.filter(a => a.riskLevel === 'low').length;
  const reviewQueue = latest.filter(a => a.reviewerStatus === 'pending' || a.reviewerStatus === 'needs_review').length;
  const avgScore = latest.length > 0
    ? Math.round(latest.reduce((s, a) => s + (a.overallCapacityScore || 0), 0) / latest.length)
    : 0;

  const pieData = [
    { name: 'Low Concern',   value: lowCount,  color: '#22c55e' },
    { name: 'Moderate',      value: modCount,  color: '#eab308' },
    { name: 'High Concern',  value: highCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const topFlagged = latest
    .filter(a => a.riskLevel === 'high' || a.riskLevel === 'moderate')
    .sort((a, b) => a.overallCapacityScore - b.overallCapacityScore)
    .slice(0, 6);

  const insights = deriveInsights({ orgs, latest, highCount, modCount, reviewQueue, avgScore, orgMap });

  const sortedForBar = [...latest].sort((a, b) => a.overallCapacityScore - b.overallCapacityScore);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Capacity Assessment Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Structured monitoring of recipient organizational capacity relative to funding commitments and stated deliverables</p>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right">
          {latest.length} of {orgs.length} organizations assessed
        </p>
      </div>

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

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatPill title="Organizations" value={orgs.length} />
        <StatPill title="Avg. Score" value={avgScore > 0 ? avgScore : '–'} sub="out of 100"
          color={avgScore >= 68 ? 'text-green-600' : avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'} />
        <StatPill title="Low Concern"  value={lowCount}  sub="Score ≥ 68" color="text-green-600" />
        <StatPill title="Moderate"     value={modCount}  sub="Score 40–67" color="text-yellow-600" />
        <StatPill title="High Concern" value={highCount} sub="Score < 40"  color="text-red-600" />
      </div>

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
                      const org = orgMap[a.organizationId];
                      return (
                        <div className="bg-card border rounded-lg shadow-lg p-2 text-xs max-w-[160px]">
                          <p className="font-semibold leading-snug">{org?.organizationName || 'Unknown'}</p>
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
                        {org?.organizationName || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {org?.organizationType} · {org?.jurisdiction}
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