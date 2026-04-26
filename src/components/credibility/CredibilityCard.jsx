import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getPatternStyle } from '@/lib/credibilityEngine';
import { Link } from 'react-router-dom';

const TREND_ICONS = {
  Increasing:  { icon: TrendingUp,   color: 'text-green-600' },
  Decreasing:  { icon: TrendingDown, color: 'text-red-600'   },
  Stable:      { icon: Minus,        color: 'text-yellow-600'},
  Unknown:     { icon: Minus,        color: 'text-muted-foreground' },
};

function MiniSparkline({ yearly }) {
  if (!yearly || yearly.length < 2) return null;
  const values = yearly.map(y => y.program_spend_percentage);
  const max = Math.max(...values, 1);
  const W = 120, H = 36, pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} className="flex-shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/60" />
      {yearly.map((y, i) => {
        const [x, yCoord] = pts[i].split(',');
        return <circle key={i} cx={x} cy={yCoord} r="2" fill="currentColor" className="text-primary" />;
      })}
    </svg>
  );
}

export default function CredibilityCard({ result, orgId }) {
  const [expanded, setExpanded] = useState(false);
  const style = getPatternStyle(result.classification);
  const hasRules = result.triggered_rules.length > 0;
  const Icon = result.pattern_score === 0 ? CheckCircle2 : result.pattern_score >= 75 ? AlertTriangle : Minus;
  const trendCfg = TREND_ICONS[result.trend?.program_trend_direction] || TREND_ICONS.Unknown;
  const TrendIcon = trendCfg.icon;

  return (
    <Card className={`border ${style.border} ${style.bg}`}>
      <CardContent className="p-4 space-y-3">

        {/* Header */}
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
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pattern Score</span>
            <span className={`text-sm font-bold tabular-nums ${style.text}`}>{result.pattern_score}/100</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${style.bar}`} style={{ width: `${result.pattern_score}%` }} />
          </div>
        </div>

        {/* Trend summary row */}
        {result.trend && result.trend.first_year && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              <TrendIcon className={`w-3.5 h-3.5 ${trendCfg.color}`} />
              <span className={`font-medium ${trendCfg.color}`}>{result.trend.program_trend_direction}</span>
              <span className="text-muted-foreground">program trend</span>
            </div>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              Avg spend: <strong>{result.trend.avg_program_spend}%</strong>
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {result.years_of_data} yr{result.years_of_data !== 1 ? 's' : ''} ({result.trend.first_year}–{result.trend.last_year})
            </span>
            {result.trend.yearly?.length >= 2 && (
              <MiniSparkline yearly={result.trend.yearly} />
            )}
          </div>
        )}

        {/* Rule pills */}
        {hasRules && (
          <div className="flex flex-wrap gap-1.5">
            {result.triggered_rules.map(rule => (
              <span key={rule.id} className={`text-[11px] font-medium px-2 py-0.5 rounded border ${style.badge} ${style.border}`}>
                {rule.label}
              </span>
            ))}
          </div>
        )}

        {/* Explanation */}
        <p className="text-xs leading-relaxed text-foreground/80">{result.explanation_text}</p>

        {/* Expandable rule detail */}
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
                {/* Year-by-year breakdown */}
                {result.trend?.yearly?.length > 0 && (
                  <div className="rounded-lg border border-border bg-card/80 px-3 py-2.5">
                    <p className="text-xs font-semibold text-foreground mb-2">Year-by-Year Breakdown</p>
                    <div className="space-y-1">
                      {result.trend.yearly.map(y => (
                        <div key={y.year} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-10 flex-shrink-0 font-mono">{y.year}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${y.program_spend_percentage <= 1 ? 'bg-red-400' : y.program_spend_percentage <= 10 ? 'bg-yellow-400' : 'bg-green-400'}`}
                              style={{ width: `${Math.min(100, y.program_spend_percentage)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-10 text-right tabular-nums">{y.program_spend_percentage}%</span>
                          {y.total_revenue > 0 && (
                            <span className="text-muted-foreground text-[10px]">${(y.total_revenue / 1000).toFixed(0)}k rev</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}