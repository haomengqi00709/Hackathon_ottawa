import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRiskColor, SCORE_WEIGHTS, getScoreColor } from '@/lib/scoringEngine';
import { AlertTriangle, CheckCircle2, AlertCircle, Info, HelpCircle, ClipboardCheck, ShieldAlert } from 'lucide-react';

const severityIcons = { high: AlertTriangle, moderate: AlertCircle, low: CheckCircle2 };
const severityColors = {
  high: 'text-red-600 bg-red-50 border-red-200',
  moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-green-600 bg-green-50 border-green-200',
};

// Ordered display list matching SCORE_WEIGHTS keys
const SCORE_DISPLAY = [
  { key: 'deliveryPlausibilityScore' },
  { key: 'programExpenseScore' },
  { key: 'staffingScore' },
  { key: 'revenueDiversityScore' },
  { key: 'infrastructureScore' },
  { key: 'complianceScore' },
];

function ScoreBar({ scoreKey, value }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const meta = SCORE_WEIGHTS[scoreKey];
  if (!meta) return null;

  const displayValue = value ?? 0;
  const colorClass = getScoreColor(displayValue);

  const barColor =
    displayValue >= 68 ? 'bg-green-500' :
    displayValue >= 40 ? 'bg-yellow-400' :
    'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{meta.label}</span>
          <div className="relative flex-shrink-0">
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
              onClick={() => setTooltipOpen(v => !v)}
              aria-label={`How ${meta.label} is calculated`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            {tooltipOpen && (
              <div className="absolute z-50 left-5 top-0 w-72 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 text-xs leading-relaxed">
                <p className="font-semibold mb-1">{meta.label} <span className="text-muted-foreground font-normal">({meta.pct} of overall score)</span></p>
                <p>{meta.tooltip}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground font-medium">{meta.pct}</span>
          <span className={`text-sm font-bold tabular-nums w-8 text-right ${colorClass}`}>{displayValue}</span>
        </div>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
}

export default function AssessmentPanel({ assessment, onRecordDecision }) {
  if (!assessment) return null;

  let factors = [];
  if (assessment.explanationFactors) {
    try { factors = JSON.parse(assessment.explanationFactors); } catch { factors = []; }
  }

  const highFactors = factors.filter(f => f.severity === 'high');
  const otherFactors = factors.filter(f => f.severity !== 'high');
  const needsReview = assessment.humanReviewRequired &&
    (assessment.reviewerStatus === 'needs_review' || assessment.reviewerStatus === 'pending');

  return (
    <div className="space-y-4">
      {/* Human review required banner */}
      {needsReview && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4">
          <ShieldAlert className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-800">Human Review Required</p>
            <p className="text-xs text-orange-700 mt-0.5">
              This assessment is flagged as {assessment.riskLevel} concern. A reviewer must confirm, downgrade, or override this finding before any funding decision is made.
            </p>
          </div>
          {onRecordDecision && (
            <Button size="sm" onClick={onRecordDecision} className="flex-shrink-0 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700">
              <ClipboardCheck className="w-3.5 h-3.5" /> Record Decision
            </Button>
          )}
        </div>
      )}

      {/* Score breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="w-4 h-4" /> Capacity Score Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Each component is weighted by its relevance to funding-capacity mismatch. Hover <HelpCircle className="inline w-3 h-3 mb-0.5" /> for methodology.
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-3xl font-bold ${getScoreColor(assessment.overallCapacityScore || 0)}`}>
                {assessment.overallCapacityScore ?? '–'}
              </div>
              <div className="text-[10px] text-muted-foreground">Overall Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {SCORE_DISPLAY.map(({ key }) => (
            <ScoreBar key={key} scoreKey={key} value={assessment[key]} />
          ))}
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
            Score of 68–100 = Low concern · 40–67 = Moderate · Below 40 = High concern
          </p>
        </CardContent>
      </Card>

      {/* AI Summary */}
      {assessment.aiSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">AI Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{assessment.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Risk factors — high severity first */}
      {factors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Scoring Rationale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...highFactors, ...otherFactors].map((f, i) => {
              const Icon = severityIcons[f.severity] || AlertCircle;
              const colorClass = severityColors[f.severity] || severityColors.moderate;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider">{f.area}</span>
                    <p className="text-sm mt-0.5">{f.detail}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}