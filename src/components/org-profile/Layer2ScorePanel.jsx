import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RISK_NATURE_CONFIG } from '@/lib/scoringEngine';
import RiskNatureBadge from '@/components/shared/RiskNatureBadge';

function DualBar({ label, value, maxConcern = false }) {
  const color = maxConcern
    ? (value >= 70 ? 'bg-red-500' : value >= 40 ? 'bg-orange-400' : 'bg-green-500')
    : (value >= 75 ? 'bg-green-500' : value >= 55 ? 'bg-yellow-400' : 'bg-red-500');

  const textColor = maxConcern
    ? (value >= 70 ? 'text-red-600' : value >= 40 ? 'text-orange-600' : 'text-green-600')
    : (value >= 75 ? 'text-green-600' : value >= 55 ? 'text-yellow-600' : 'text-red-600');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={`font-bold tabular-nums ${textColor}`}>{value ?? '–'}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

export default function Layer2ScorePanel({ assessment }) {
  if (!assessment) return null;
  const { capacityReadinessScore, integrityConcernScore, riskNature, recommendedFundingPath } = assessment;
  if (capacityReadinessScore == null && integrityConcernScore == null) return null;

  const cfg = RISK_NATURE_CONFIG[riskNature] || {};

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Risk Nature Assessment</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Two parallel scores determine whether observed gaps reflect developmental under-readiness or elevated integrity concern.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Two scores side-by-side on md+ */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacity Readiness</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Can this organization deliver what it proposes?
            </p>
            <DualBar label="Readiness Score" value={capacityReadinessScore} maxConcern={false} />
            <p className="text-[10px] text-muted-foreground">75+ = Strong · 55–74 = Moderate · &lt;55 = Weak</p>
          </div>
          <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Integrity Concern</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Do the gaps look developmental or patterned?
            </p>
            <DualBar label="Concern Score" value={integrityConcernScore} maxConcern={true} />
            <p className="text-[10px] text-muted-foreground">&lt;25 = Low · 25–49 = Mild · 50–69 = Elevated · 70+ = High</p>
          </div>
        </div>

        {/* Classification */}
        {riskNature && (
          <div className={`rounded-lg border p-3 space-y-2 ${cfg.bg} ${cfg.border}`}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classification</p>
            <RiskNatureBadge riskNature={riskNature} size="lg" />
            <p className={`text-xs leading-relaxed ${cfg.color}`}>{cfg.template}</p>
          </div>
        )}

        {/* Recommended path */}
        {recommendedFundingPath && (
          <div className="rounded-lg border p-3 bg-background space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Funding Path</p>
            <p className="text-sm font-semibold text-foreground">{recommendedFundingPath}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}