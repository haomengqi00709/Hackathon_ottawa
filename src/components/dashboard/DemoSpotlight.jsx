// "Real-data spotlight" — pulls the top three actual high-ghost-score
// organizations from the warehouse via /api/named/ghost_top. Replaces an
// earlier hard-coded DEMO_ORGS array (three made-up orgs with stale
// Supabase UUIDs that didn't exist in the new backend).
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Database, X, AlertTriangle, ShieldX, HelpCircle, Loader2 } from 'lucide-react';
import { reqEnvelope } from '@/api/httpClient';

const fmtCAD = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }).format(Number(n));

function classifyForUI(score) {
  if (score >= 8) {
    return {
      tagline: '🚨 Ghost — Score ' + score + '/10',
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
  if (score >= 5) {
    return {
      tagline: '⚠️ Borderline — Score ' + score + '/10',
      verdict: 'Enhanced monitoring recommended at renewal.',
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
    tagline: 'Score ' + score + '/10',
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

function buildDescription(row) {
  const govt = fmtCAD(row.govt_revenue);
  const dep = row.govt_share_of_rev != null ? `${Math.round(Number(row.govt_share_of_rev))}% govt-dependent` : '';
  const prog = row.programs_pct != null ? `${Number(row.programs_pct).toFixed(0)}% program spend` : '';
  const emp = Number(row.employees) === 0 ? 'reports zero paid employees' : `${row.employees} employees on T3010`;
  const parts = [emp];
  if (govt && govt !== '—') parts.push(`receives ${govt} in government funding`);
  if (dep) parts.push(dep);
  if (prog) parts.push(prog);
  return parts.join(', ') + '.';
}

function buildTalkingPoints(row) {
  const points = [];
  if (Number(row.employees) === 0) points.push('0 paid employees on T3010');
  if (Number(row.total_compensation) > 0 && Number(row.employees) === 0)
    points.push(`${fmtCAD(row.total_compensation)} compensation paid with no staff`);
  points.push(`${fmtCAD(row.govt_revenue)} in government funding`);
  if (row.govt_share_of_rev != null)
    points.push(`${Math.round(Number(row.govt_share_of_rev))}% government dependency`);
  if (row.programs_pct != null && Number(row.programs_pct) < 10)
    points.push(`${Number(row.programs_pct).toFixed(1)}% program spend (very low)`);
  return points.slice(0, 3);
}

export default function DemoSpotlight() {
  const [dismissed, setDismissed] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'spotlight'],
    queryFn: () => reqEnvelope('/api/named/ghost_top?limit=3'),
    staleTime: 5 * 60 * 1000,
  });

  if (dismissed) return null;
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading top warehouse-scored ghost candidates…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
        Failed to load real-data spotlight: {String(error.message ?? error)}
      </div>
    );
  }

  // /api/named/* returns {columns, rows, total, ...} — not the standard data envelope.
  const rows = (data?.data?.rows ?? data?.rows ?? []);
  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/10">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Live warehouse spotlight — top ghost-scored charities (FY 2023)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[10px] text-muted-foreground italic">
            cra.govt_funding_by_charity ⨝ cra.cra_compensation
          </span>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {rows.map((row, i) => {
          const ui = classifyForUI(Number(row.ghost_score));
          const Icon = ui.Icon;
          const description = buildDescription(row);
          const talkingPoints = buildTalkingPoints(row);
          return (
            <div key={row.bn || i} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${ui.badgeBg}`}>
                    {ui.tagline}
                  </span>
                  <p className="font-semibold text-sm leading-snug">{row.legal_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {row.province ?? '—'} · BN {row.bn} · FY {row.fiscal_year}
                  </p>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`text-2xl font-bold tabular-nums leading-none ${ui.scoreColor}`}>{row.ghost_score}</span>
                  <span className="text-[10px] text-muted-foreground">/10</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

              <ul className="space-y-1">
                {talkingPoints.map((pt, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-xs">
                    <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${ui.iconClass}`} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${ui.verdictClass}`}>
                {ui.verdict}
              </div>

              {row.entity_id ? (
                <Link
                  to={`/organizations/${row.entity_id}`}
                  className={`mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${ui.bg} ${ui.borderColor} hover:opacity-80`}
                >
                  Open Profile <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <span className="mt-auto text-[11px] text-muted-foreground italic px-3 py-1.5">
                  No resolved entity — search by name in Data Explorer
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
