import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ScoreGauge from '@/components/shared/ScoreGauge';
import { getRiskColor } from '@/lib/scoringEngine';
import { AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const severityIcons = { high: AlertTriangle, moderate: AlertCircle, low: CheckCircle2 };
const severityColors = { high: 'text-red-600 bg-red-50 border-red-200', moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200', low: 'text-green-600 bg-green-50 border-green-200' };

export default function AssessmentPanel({ assessment }) {
  if (!assessment) return null;

  const scores = [
    { key: 'staffingScore', label: 'Staffing' },
    { key: 'infrastructureScore', label: 'Infrastructure' },
    { key: 'revenueDiversityScore', label: 'Revenue Diversity' },
    { key: 'programExpenseScore', label: 'Program Spending' },
    { key: 'dependencyScore', label: 'Dependency' },
    { key: 'deliveryPlausibilityScore', label: 'Delivery Plausibility' },
  ];

  let factors = [];
  if (assessment.explanationFactors) {
    try { factors = JSON.parse(assessment.explanationFactors); } catch { factors = []; }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4" /> Component Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {scores.map(s => (
              <ScoreGauge key={s.key} score={assessment[s.key] || 0} label={s.label} />
            ))}
          </div>
        </CardContent>
      </Card>

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

      {factors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Why This Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {factors.map((f, i) => {
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