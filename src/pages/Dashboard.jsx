import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Building2, AlertTriangle, CheckCircle2, ClipboardCheck, ArrowRight, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import StatCard from '@/components/shared/StatCard';
import RiskBadge from '@/components/shared/RiskBadge';

export default function Dashboard() {
  const { data: orgs = [] } = useQuery({ queryKey: ['orgs'], queryFn: () => base44.entities.Organizations.list() });
  const { data: assessments = [] } = useQuery({ queryKey: ['assessments'], queryFn: () => base44.entities.CapacityAssessments.list() });
  const { data: reviews = [] } = useQuery({ queryKey: ['reviews'], queryFn: () => base44.entities.ReviewDecisions.list() });

  const latestAssessments = {};
  assessments.forEach(a => {
    if (!latestAssessments[a.organizationId] || new Date(a.assessmentDate) > new Date(latestAssessments[a.organizationId].assessmentDate)) {
      latestAssessments[a.organizationId] = a;
    }
  });
  const latest = Object.values(latestAssessments);

  const lowCount = latest.filter(a => a.riskLevel === 'low').length;
  const modCount = latest.filter(a => a.riskLevel === 'moderate').length;
  const highCount = latest.filter(a => a.riskLevel === 'high').length;
  const reviewQueue = latest.filter(a => a.reviewerStatus === 'pending' || a.reviewerStatus === 'needs_review').length;
  const avgScore = latest.length > 0 ? Math.round(latest.reduce((s, a) => s + a.overallCapacityScore, 0) / latest.length) : 0;

  const pieData = [
    { name: 'Low Concern', value: lowCount, color: '#22c55e' },
    { name: 'Moderate', value: modCount, color: '#eab308' },
    { name: 'High Concern', value: highCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const topFlagged = latest
    .filter(a => a.riskLevel === 'high' || a.riskLevel === 'moderate')
    .sort((a, b) => a.overallCapacityScore - b.overallCapacityScore)
    .slice(0, 5);

  const orgMap = {};
  orgs.forEach(o => { orgMap[o.id] = o; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capacity Assessment Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoring organizational capacity against funding commitments
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <strong>Notice:</strong> This tool provides an early-warning assessment based on available structured indicators and evidence. It does not determine fraud, misconduct, or legal non-compliance. All flagged cases require human review.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Organizations" value={orgs.length} icon={Building2} />
        <StatCard title="Low Concern" value={lowCount} subtitle="Score ≥ 70" icon={CheckCircle2} color="bg-green-500" />
        <StatCard title="Moderate" value={modCount} subtitle="Score 40–69" icon={TrendingDown} color="bg-yellow-500" />
        <StatCard title="High Concern" value={highCount} subtitle="Score < 40" icon={AlertTriangle} color="bg-red-500" />
        <StatCard title="Review Queue" value={reviewQueue} subtitle="Pending review" icon={ClipboardCheck} color="bg-blue-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No assessments yet</p>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {latest.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={latest.sort((a,b) => a.overallCapacityScore - b.overallCapacityScore)}>
                  <XAxis dataKey="organizationId" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const a = payload[0].payload;
                    const org = orgMap[a.organizationId];
                    return (
                      <div className="bg-card border rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-semibold">{org?.organizationName || 'Unknown'}</p>
                        <p className="text-muted-foreground">Score: {a.overallCapacityScore}</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="overallCapacityScore" radius={[2, 2, 0, 0]}>
                    {latest.sort((a,b) => a.overallCapacityScore - b.overallCapacityScore).map((a, i) => (
                      <Cell key={i} fill={a.overallCapacityScore >= 70 ? '#22c55e' : a.overallCapacityScore >= 40 ? '#eab308' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No assessments yet</p>
            )}
          </CardContent>
        </Card>

        {/* Average */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Average Capacity Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className={`text-5xl font-bold ${avgScore >= 70 ? 'text-green-600' : avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {avgScore}
            </div>
            <p className="text-xs text-muted-foreground mt-2">out of 100</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Flagged */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Top Flagged Organizations</CardTitle>
          <Link to="/review-queue">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View Queue <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {topFlagged.length > 0 ? (
            <div className="space-y-3">
              {topFlagged.map(a => {
                const org = orgMap[a.organizationId];
                return (
                  <Link key={a.id} to={`/organizations/${a.organizationId}`}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{org?.organizationName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{org?.organizationType} · {org?.jurisdiction}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${a.overallCapacityScore >= 70 ? 'text-green-600' : a.overallCapacityScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {a.overallCapacityScore}
                      </p>
                    </div>
                    <RiskBadge level={a.riskLevel} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No flagged organizations</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}