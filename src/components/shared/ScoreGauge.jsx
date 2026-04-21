import React from 'react';
import { getScoreColor, getScoreBgColor } from '@/lib/scoringEngine';

export default function ScoreGauge({ score, label, size = 'md' }) {
  const colorClass = getScoreColor(score);
  const bgClass = getScoreBgColor(score);

  const dims = size === 'lg' 
    ? { w: 'w-24 h-24', text: 'text-2xl', label: 'text-xs' }
    : { w: 'w-16 h-16', text: 'text-lg', label: 'text-[10px]' };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`${dims.w} rounded-full border-4 border-muted flex items-center justify-center relative`}>
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'} ${score * 3.6}deg, transparent 0deg)`,
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
          }}
        />
        <span className={`font-bold ${dims.text} ${colorClass}`}>{score}</span>
      </div>
      {label && <span className={`${dims.label} text-muted-foreground font-medium text-center`}>{label}</span>}
    </div>
  );
}