import React from 'react';
import { CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RISK_NATURE_CONFIG } from '@/lib/scoringEngine';

export default function WhyThisCase({ assessment }) {
  if (!assessment?.whyThisCase && !assessment?.explanationFactors) return null;

  let why = null;
  if (assessment.whyThisCase) {
    try { why = typeof assessment.whyThisCase === 'string' ? JSON.parse(assessment.whyThisCase) : assessment.whyThisCase; } catch { why = null; }
  }
  if (!why) return null;

  const cfg = RISK_NATURE_CONFIG[assessment.riskNature] || {};

  return (
    <Card className={`border-2 ${cfg.border || 'border-border'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-muted-foreground" />
          Why this case landed here
        </CardTitle>
        {assessment.riskNature && (
          <div className={`inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-lg border w-fit ${cfg.badge} ${cfg.border}`}>
            <span>{cfg.emoji}</span> {assessment.riskNature}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-0.5">Strongest Positive Signal</p>
            <p className="text-sm text-green-800 leading-snug">{why.positiveSignal}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-0.5">Strongest Caution Signal</p>
            <p className="text-sm text-red-800 leading-snug">{why.cautionSignal}</p>
          </div>
        </div>

        <div className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg || 'bg-muted/30'} ${cfg.border || 'border-border'}`}>
          <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color || 'text-muted-foreground'}`} />
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${cfg.color || 'text-muted-foreground'}`}>Reason for Classification</p>
            <p className={`text-sm leading-snug ${cfg.color || 'text-foreground'}`}>{why.classificationReason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}