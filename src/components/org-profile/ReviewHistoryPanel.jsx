import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const decisionLabels = {
  no_concern: 'No Concern',
  monitor: 'Monitor',
  conditional_funding: 'Conditional Funding',
  further_review: 'Further Review',
  do_not_renew: 'Do Not Renew',
};

const decisionColors = {
  no_concern: 'bg-green-100 text-green-800',
  monitor: 'bg-yellow-100 text-yellow-800',
  conditional_funding: 'bg-yellow-100 text-yellow-800',
  further_review: 'bg-red-100 text-red-800',
  do_not_renew: 'bg-red-100 text-red-800',
};

export default function ReviewHistoryPanel({ decisions }) {
  if (!decisions.length) return (
    <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No review decisions</CardContent></Card>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Review History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {decisions.map(d => (
          <div key={d.id} className="p-3 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={decisionColors[d.finalDecision] || 'bg-muted'}>{decisionLabels[d.finalDecision] || d.finalDecision}</Badge>
                <span className="text-xs text-muted-foreground">{d.reviewerName}</span>
              </div>
              <span className="text-xs text-muted-foreground">{d.decisionDate ? format(new Date(d.decisionDate), 'MMM d, yyyy') : ''}</span>
            </div>
            {d.rationale && <p className="text-sm text-muted-foreground">{d.rationale}</p>}
            {d.followUpAction && <p className="text-xs text-muted-foreground italic">Follow-up: {d.followUpAction}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}