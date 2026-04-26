import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { getDecisionStyle } from '@/lib/decisionEngine';
import { Link } from 'react-router-dom';

const RISK_COLORS = {
  High:     'text-red-600',
  Moderate: 'text-yellow-600',
  Low:      'text-green-600',
};

export default function DecisionCard({ result, orgId }) {
  const [expanded, setExpanded] = useState(false);
  const style = getDecisionStyle(result.classification);

  return (
    <Card className={`border ${style.border} ${style.bg}`}>
      <CardContent className="p-4 space-y-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base leading-none flex-shrink-0">{style.emoji}</span>
            {orgId ? (
              <Link to={`/organizations/${orgId}`} className="font-semibold text-sm hover:underline truncate">
                {result.organization_name}
              </Link>
            ) : (
              <span className="font-semibold text-sm truncate">{result.organization_name}</span>
            )}
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>
            {result.classification}
          </span>
        </div>

        {/* Risk level + action */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold uppercase tracking-wide ${RISK_COLORS[result.overall_risk_level] || 'text-muted-foreground'}`}>
            {result.overall_risk_level} Risk
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">Action confidence: <strong>{result.action_confidence}%</strong></span>
        </div>

        {/* Score bars */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Mismatch</span>
              <span className="font-bold tabular-nums">{result.mismatch_score}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${result.mismatch_score >= 75 ? 'bg-red-500' : result.mismatch_score >= 25 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${result.mismatch_score}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pattern</span>
              <span className="font-bold tabular-nums">{result.pattern_score}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${result.pattern_score >= 75 ? 'bg-red-500' : result.pattern_score >= 25 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${result.pattern_score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recommended action */}
        <div className={`rounded-lg border ${style.border} px-3 py-2 flex items-start gap-2`}>
          <Zap className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${style.color}`} />
          <p className={`text-xs font-semibold leading-snug ${style.color}`}>{result.recommended_action}</p>
        </div>

        {/* Explanation */}
        <p className="text-xs leading-relaxed text-foreground/80">{result.explanation_text}</p>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className={`text-xs flex items-center gap-1 font-medium ${style.color} hover:opacity-75 transition-opacity`}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide score detail' : 'View score detail'}
        </button>

        {expanded && (
          <div className="rounded-lg border border-border bg-card/80 px-3 py-3 space-y-2">
            <p className="text-xs font-semibold text-foreground mb-1">Signal Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Mismatch Score</p>
                <p className="font-bold text-lg tabular-nums">{result.mismatch_score}<span className="text-muted-foreground text-xs font-normal">/100</span></p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Pattern Score</p>
                <p className="font-bold text-lg tabular-nums">{result.pattern_score}<span className="text-muted-foreground text-xs font-normal">/100</span></p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Risk Level</p>
                <p className={`font-semibold ${RISK_COLORS[result.overall_risk_level]}`}>{result.overall_risk_level}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Action Confidence</p>
                <p className="font-semibold">{result.action_confidence}%</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              Action confidence reflects the combined strength of mismatch and pattern signals. Higher confidence means more data points corroborate the recommendation — it does not imply a final determination.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}