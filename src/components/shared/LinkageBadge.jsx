import React from 'react';
import { Link2, Network, FileQuestion, ScanLine } from 'lucide-react';

const METHOD_STYLE = {
  bn_anchor:              { label: 'BN-anchored',     icon: Link2,        color: 'text-green-700 bg-green-50 border-green-200' },
  bn_new:                 { label: 'BN seed',         icon: Link2,        color: 'text-green-700 bg-green-50 border-green-200' },
  exact_name:             { label: 'Exact name',      icon: Link2,        color: 'text-green-700 bg-green-50 border-green-200' },
  normalized:             { label: 'Normalized name', icon: Link2,        color: 'text-blue-700 bg-blue-50 border-blue-200' },
  pipe_split:             { label: 'Bilingual variant', icon: Link2,      color: 'text-blue-700 bg-blue-50 border-blue-200' },
  trade_name:             { label: 'Trade name',      icon: Link2,        color: 'text-blue-700 bg-blue-50 border-blue-200' },
  splink:                 { label: 'Splink (probabilistic)', icon: Network, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  trigram:                { label: 'Trigram',         icon: ScanLine,     color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  donee_trigram_fallback: { label: 'Donee trigram',   icon: ScanLine,     color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  new_entity:             { label: 'New entity',      icon: Link2,        color: 'text-muted-foreground bg-muted/40 border-border' },
};

export default function LinkageBadge({ method, confidence }) {
  if (!method) return null;
  const style = METHOD_STYLE[method] ?? { label: method, icon: FileQuestion, color: 'text-muted-foreground bg-muted/40 border-border' };
  const Icon = style.icon;
  const c = confidence != null ? Number(confidence).toFixed(2) : null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${style.color}`}
      title={`Match method: ${method}${c ? ` (confidence ${c})` : ''}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {style.label}{c ? ` ${c}` : ''}
    </span>
  );
}
