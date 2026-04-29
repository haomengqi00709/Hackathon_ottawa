import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fetchOrgQuality } from '@/api/httpClient';

const fmtCAD = (n) =>
  n == null ? '—' :
  new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
  }).format(Number(n));

export default function DataQualityPanel({ orgId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['org-quality', orgId],
    queryFn: () => fetchOrgQuality(orgId),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || error || !data) return null;
  const { summary, impossibilities, plausibilityFlags, doneeNameQuality } = data;
  const hasAnything =
    summary.impossibility_count > 0 ||
    summary.plausibility_count > 0 ||
    summary.donee_quality_issue_count > 0;
  if (!hasAnything) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
          <ShieldAlert className="w-4 h-4" /> Data-Quality Notices
        </CardTitle>
        <p className="text-[11px] text-amber-700">
          Flagged by upstream ETL — <code>cra.t3010_impossibilities</code>, <code>cra.t3010_plausibility_flags</code>, and <code>cra.donee_name_quality</code>.
          These are warehouse-level signals, not findings of misconduct.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">

        {summary.impossibility_count > 0 && (
          <div className="rounded-lg bg-white border border-amber-200 px-3 py-2">
            <p className="text-xs font-semibold text-amber-900 mb-1">
              {summary.impossibility_count} arithmetic impossibilit{summary.impossibility_count > 1 ? 'ies' : 'y'} on T3010 filings
            </p>
            <ul className="space-y-0.5">
              {(impossibilities || []).slice(0, 3).map((r, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-snug">
                  <span className="font-mono text-amber-800">{r.rule_code}</span>
                  {r.rule_family ? ` (${r.rule_family})` : ''} · FY {r.fiscal_year}
                  {r.details ? ` — ${String(r.details).slice(0, 90)}` : ''}
                </li>
              ))}
              {impossibilities && impossibilities.length > 3 && (
                <li className="text-[10px] italic text-muted-foreground">
                  + {impossibilities.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {summary.plausibility_count > 0 && (
          <div className="rounded-lg bg-white border border-amber-200 px-3 py-2">
            <p className="text-xs font-semibold text-amber-900 mb-1">
              {summary.plausibility_count} plausibility outlier{summary.plausibility_count > 1 ? 's' : ''}
            </p>
            <ul className="space-y-0.5">
              {(plausibilityFlags || []).slice(0, 3).map((r, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-snug">
                  <span className="font-mono text-amber-800">{r.rule_code}</span> · {r.offending_field}
                  {r.details ? ` — ${String(r.details).slice(0, 90)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.donee_quality_issue_count > 0 && doneeNameQuality?.length > 0 && (
          <div className="rounded-lg bg-white border border-amber-200 px-3 py-2">
            <p className="text-xs font-semibold text-amber-900 mb-1">
              Donee-record quality issues
            </p>
            <ul className="space-y-0.5">
              {doneeNameQuality.slice(0, 4).map((r, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-snug">
                  <span className="font-mono text-amber-800">{r.mismatch_category}</span>
                  {r.bn_defect ? ` · BN: ${r.bn_defect}` : ''}
                  {' · '}
                  {r.n_rows} row{r.n_rows > 1 ? 's' : ''} · {fmtCAD(r.total_amount)}
                </li>
              ))}
            </ul>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
