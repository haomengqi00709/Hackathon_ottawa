import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

export default function FundingPanel({ records }) {
  if (!records.length) return (
    <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No funding records</CardContent></Card>
  );

  const total = records.reduce((s, r) => s + (r.fundingAmount || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Funding Records</CardTitle>
        <Badge variant="secondary" className="font-mono">${total.toLocaleString()}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.map(r => (
          <div key={r.id} className="p-3 rounded-lg border space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{r.fundingProgramName}</p>
              <span className="text-sm font-bold">${(r.fundingAmount || 0).toLocaleString()}</span>
            </div>
            <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
              {r.fundingSource && <span>Source: {r.fundingSource}</span>}
              {r.fiscalYear && <span>· FY {r.fiscalYear}</span>}
              {r.reportingPeriodMonths && <span>· {r.reportingPeriodMonths}mo period</span>}
            </div>
            {r.fundingPurpose && <p className="text-xs text-muted-foreground">{r.fundingPurpose}</p>}
            {r.expectedDeliverables && <p className="text-xs text-muted-foreground italic">Deliverables: {r.expectedDeliverables}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}