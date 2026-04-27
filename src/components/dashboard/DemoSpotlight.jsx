// "Real Cases" — pulls the 3 high-risk assessments with the lowest overall
// capacity scores from /api/assessments?riskLevel=high&sort=score_asc&limit=3.
// Replaces an earlier ghost_top fetch which ranked by ghost-flag count rather
// than capacity-score severity. Each row carries entityCanonicalName, the six
// dimension scores, ghostFlags, riskNature and recommendedFundingPath, so the
// description and talking points are built from the live assessment row.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Database, X, AlertTriangle, ShieldX, HelpCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GHOST_FLAG_LABEL = {
  NO_PAID_EMPLOYEES: 'reports zero paid employees on T3010',
  NEAR_TOTAL_GOVT_DEPENDENCY: 'near-total government revenue dependency',
  NEAR_ZERO_PROGRAMS: 'near-zero program-delivery spending',
  COMP_WITH_NO_EMPLOYEES: 'compensation paid with no staff on file',
};

function classifyForUI(score) {
  if (score < 25) {
    return {
      tagline: '🚨 Severe — Score ' + score + '/100',
      verdict: 'Formal investigation recommended before any renewal.',
      verdictClass: 'text-red-700 bg-red-50 border-red-200',
      scoreColor: 'text-red-600',
      borderColor: 'border-red-200',
      bg: 'bg-red-50',
      badgeBg: 'bg-red-100 text-red-800',
      Icon: ShieldX,
      iconClass: 'text-red-500',
    };
  }
  if (score < 40) {
    return {
      tagline: '⚠️ High Concern — Score ' + score + '/100',
      verdict: 'Enhanced due diligence required prior to determination.',
      verdictClass: 'text-orange-700 bg-orange-50 border-orange-200',
      scoreColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      bg: 'bg-orange-50',
      badgeBg: 'bg-orange-100 text-orange-800',
      Icon: AlertTriangle,
      iconClass: 'text-orange-500',
    };
  }
  return {
    tagline: 'Score ' + score + '/100',
    verdict: 'Standard renewal conditions apply.',
    verdictClass: 'text-blue-700 bg-blue-50 border-blue-200',
    scoreColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    bg: 'bg-blue-50',
    badgeBg: 'bg-blue-100 text-blue-800',
    Icon: HelpCircle,
    iconClass: 'text-blue-500',
  };
}

function buildDescription(a) {
  const parts = [];
  if (a.riskNature) parts.push(a.riskNature.toLowerCase());
  if (typeof a.staffingScore === 'number' && a.staffingScore < 30) parts.push('staffing capacity well below threshold');
  if (typeof a.programExpenseScore === 'number' && a.programExpenseScore < 30) parts.push('program-spend ratio in the high-concern band');
  if (typeof a.deliveryPlausibilityScore === 'number' && a.deliveryPlausibilityScore < 30) parts.push('delivery plausibility scoring as implausible');
  if (typeof a.revenueDiversityScore === 'number' && a.revenueDiversityScore < 30) parts.push('near-total dependency on a single funder');
  if (parts.length === 0) parts.push(`${a.riskLevel} concern across multiple dimensions`);
  return parts.slice(0, 3).join('; ') + '.';
}

function buildTalkingPoints(a) {
  const points = [];
  const flags = Array.isArray(a.ghostFlags) ? a.ghostFlags : [];
  flags.slice(0, 3).forEach((f) => {
    const label = GHOST_FLAG_LABEL[f];
    if (label) points.push(label);
  });
  // Fall back to dimension scores when the row carries no ghost flags
  if (points.length === 0) {
    if (typeof a.staffingScore === 'number')
      points.push(`Staffing: ${a.staffingScore}/100`);
    if (typeof a.programExpenseScore === 'number')
      points.push(`Program spend: ${a.programExpenseScore}/100`);
    if (typeof a.revenueDiversityScore === 'number')
      points.push(`Revenue diversity: ${a.revenueDiversityScore}/100`);
  }
  if (a.recommendedFundingPath) points.push(`Path: ${a.recommendedFundingPath}`);
  return points.slice(0, 3);
}

export default function DemoSpotlight() {
  const [dismissed, setDismissed] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'spotlight', 'lowest-capacity'],
    queryFn: () =>
      base44.entities.CapacityAssessments.filter({
        riskLevel: 'high',
        sort: 'score_asc',
        limit: 3,
      }),
    staleTime: 5 * 60 * 1000,
  });

  if (dismissed) return null;
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading lowest-scoring high-risk cases…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
        Failed to load real cases: {String(error.message ?? error)}
      </div>
    );
  }

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/10">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Real Cases — 3 lowest-scoring high-concern assessments
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[10px] text-muted-foreground italic">
            scored from cra ⨝ fed ⨝ ab via /api/assessments
          </span>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {rows.map((a, i) => {
          const score = Number(a.overallCapacityScore ?? 0);
          const ui = classifyForUI(score);
          const Icon = ui.Icon;
          const description = buildDescription(a);
          const talkingPoints = buildTalkingPoints(a);
          const displayName = a.entityCanonicalName || `entity_id ${a.organizationId}`;
          return (
            <div key={a.id || i} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${ui.badgeBg}`}>
                    {ui.tagline}
                  </span>
                  <p className="font-semibold text-sm leading-snug">{displayName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.bnRoot ? `BN ${a.bnRoot}` : 'No CRA filing'} · FY {a.fiscalYear}
                  </p>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`text-2xl font-bold tabular-nums leading-none ${ui.scoreColor}`}>{score}</span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

              {talkingPoints.length > 0 && (
                <ul className="space-y-1">
                  {talkingPoints.map((pt, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs">
                      <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${ui.iconClass}`} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${ui.verdictClass}`}>
                {ui.verdict}
              </div>

              <Link
                to={`/organizations/${a.organizationId}`}
                className={`mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${ui.bg} ${ui.borderColor} hover:opacity-80`}
              >
                Open Profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
