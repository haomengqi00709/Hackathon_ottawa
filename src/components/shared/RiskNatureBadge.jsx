import React from 'react';
import { RISK_NATURE_CONFIG } from '@/lib/scoringEngine';

export default function RiskNatureBadge({ riskNature, size = 'sm' }) {
  if (!riskNature) return null;
  const cfg = RISK_NATURE_CONFIG[riskNature] || {};

  if (size === 'lg') {
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.badge} ${cfg.border}`}>
        <span>{cfg.emoji}</span>
        {riskNature}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge} ${cfg.border}`}>
      <span>{cfg.emoji}</span>
      {riskNature}
    </span>
  );
}