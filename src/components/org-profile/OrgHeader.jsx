import React from 'react';
import { Building2, Globe, MapPin, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RiskBadge from '@/components/shared/RiskBadge';
import ScoreGauge from '@/components/shared/ScoreGauge';

export default function OrgHeader({ org, assessment }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-6 p-6 bg-card rounded-xl border">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{org.organizationName}</h1>
            <Badge variant="secondary" className="capitalize">{org.organizationType}</Badge>
            <Badge variant="outline" className={`capitalize ${org.activeStatus === 'active' ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}>
              {org.activeStatus}
            </Badge>
            {assessment && <RiskBadge level={assessment.riskLevel} size="lg" />}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {org.jurisdiction && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{org.jurisdiction}</span>}
            {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="w-3.5 h-3.5" />{org.website}</a>}
            {org.yearFounded && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Est. {org.yearFounded}</span>}
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{org.employeeCount || 0} employees, {org.volunteerCount || 0} volunteers</span>
          </div>
          {org.missionDescription && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{org.missionDescription}</p>}
        </div>
      </div>
      {assessment && (
        <div className="flex-shrink-0">
          <ScoreGauge score={assessment.overallCapacityScore} label="Overall Score" size="lg" />
        </div>
      )}
    </div>
  );
}