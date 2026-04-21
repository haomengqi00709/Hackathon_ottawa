import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || 'bg-primary/10'}`}>
            <Icon className={`w-5 h-5 ${color ? 'text-white' : 'text-primary'}`} />
          </div>
        )}
      </div>
    </Card>
  );
}