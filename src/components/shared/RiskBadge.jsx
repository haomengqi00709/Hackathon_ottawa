import React from 'react';
import { getRiskColor } from '@/lib/scoringEngine';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

const icons = {
  low: CheckCircle2,
  moderate: AlertCircle,
  high: AlertTriangle,
};

export default function RiskBadge({ level, size = 'sm' }) {
  const colors = getRiskColor(level);
  const Icon = icons[level] || AlertCircle;

  if (size === 'lg') {
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${colors.badge}`}>
        <Icon className="w-4 h-4" />
        {level === 'low' ? 'Low Concern' : level === 'moderate' ? 'Moderate Concern' : 'High Concern'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {level === 'low' ? 'Low' : level === 'moderate' ? 'Moderate' : 'High'}
    </span>
  );
}