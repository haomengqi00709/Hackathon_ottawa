import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Minus } from 'lucide-react';
import { getMismatchStyle } from '@/lib/mismatchEngine';
import { Link } from 'react-router-dom';

function ScoreBar({ score, style }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Mismatch Score</span>
        <span className={`text-sm font-bold tabular-nums ${style.text}`}>{score}/100</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function MismatchCard({ result, orgId }) {
  const [expanded, setExpanded] = useState(false);
  const style = getMismatchStyle(result.classification);
  const hasRules = result.triggered_rules.length > 0;
  const Icon = result.mismatch_score === 0
    ? CheckCircle2
    : result.mismatch_score >= 75
    ? AlertTriangle
    : Minus;

  return (
    <Card className={`border ${style.border} ${style.bg} transition-all`}>
      <CardContent className="p-4 space-y-3">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`w-4 h-4 flex-shrink-0 ${style.text}`} />
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

        {/* Score bar */}
        <ScoreBar score={result.mismatch_score} style={style} />

        {/* Triggered rule pills */}
        {hasRules && (
          <div className="flex flex-wrap gap-1.5">
            {result.triggered_rules.map(rule => (
              <span
                key={rule.id}
                className={`text-[11px] font-medium px-2 py-0.5 rounded border ${style.badge} ${style.border}`}
              >
                {rule.label}
              </span>
            ))}
          </div>
        )}

        {/* Explanation */}
        <p className="text-xs leading-relaxed text-foreground/80">{result.explanation_text}</p>

        {/* Expand for rule detail */}
        {hasRules && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              className={`text-xs flex items-center gap-1 font-medium ${style.text} hover:opacity-75 transition-opacity`}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide rule details' : 'View rule details'}
            </button>

            {expanded && (
              <div className="space-y-2 pt-1">
                {result.triggered_rules.map(rule => (
                  <div key={rule.id} className="rounded-lg border border-border bg-card/80 px-3 py-2.5">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{rule.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rule.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}