import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Globe, Newspaper, Users, MapPin, DollarSign, MoreHorizontal } from 'lucide-react';

const typeIcons = { filing: FileText, website: Globe, media: Newspaper, staffing: Users, address: MapPin, financial: DollarSign, other: MoreHorizontal };

export default function EvidencePanel({ items }) {
  if (!items.length) return (
    <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No evidence items</CardContent></Card>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Evidence ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map(item => {
          const Icon = typeIcons[item.evidenceType] || FileText;
          return (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <Badge variant="secondary" className="text-[10px] capitalize">{item.evidenceType}</Badge>
                  {item.reliabilityRating && (
                    <Badge variant="outline" className={`text-[10px] ${
                      item.reliabilityRating === 'high' ? 'border-green-200 text-green-700' :
                      item.reliabilityRating === 'medium' ? 'border-yellow-200 text-yellow-700' : 'border-red-200 text-red-700'
                    }`}>{item.reliabilityRating}</Badge>
                  )}
                </div>
                {item.source && <p className="text-xs text-muted-foreground mt-0.5">{item.source} {item.sourceDate && `· ${item.sourceDate}`}</p>}
                {item.extractedSummary && <p className="text-xs text-muted-foreground mt-1">{item.extractedSummary}</p>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}