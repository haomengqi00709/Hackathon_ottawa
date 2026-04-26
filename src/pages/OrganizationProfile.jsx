import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, Building2, Globe, MapPin, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RiskBadge from '@/components/shared/RiskBadge';
import ReportCard from '@/components/org-profile/ReportCard';
import InlineReviewDialog from '@/components/org-profile/InlineReviewDialog';
import { calculateCapacityScores } from '@/lib/scoringEngine';

export default function OrganizationProfile() {
  const { id: orgId } = useParams();
  const qc = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { data: org } = useQuery({
    queryKey: ['org', orgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organizations.filter({ id: orgId });
      return orgs[0];
    },
    enabled: !!orgId,
  });

  const { data: funding = [] } = useQuery({ queryKey: ['funding', orgId], queryFn: () => base44.entities.FundingRecords.filter({ organizationId: orgId }) });
  const { data: financials = [] } = useQuery({ queryKey: ['financials', orgId], queryFn: () => base44.entities.FinancialIndicators.filter({ organizationId: orgId }) });
  const { data: assessments = [] } = useQuery({ queryKey: ['assessments-org', orgId], queryFn: () => base44.entities.CapacityAssessments.filter({ organizationId: orgId }) });

  const latestAssessment = assessments.sort((a, b) => new Date(b.assessmentDate) - new Date(a.assessmentDate))[0];

  const runAssessment = async () => {
    if (!org) return;
    setIsRunning(true);
    const scores = calculateCapacityScores(org, funding, financials, []);

    let aiSummary = '';
    try {
      const prompt = `You are a capacity assessment analyst. Write a 2-3 sentence neutral, professional summary for a human reviewer about this organization.

Organization: ${org.organizationName} (${org.organizationType})
Overall Capacity Score: ${scores.overallCapacityScore}/100
Risk Nature Classification: ${scores.riskNature}
Key findings:
${scores.factors.map(f => `- [${f.severity.toUpperCase()}] ${f.area}: ${f.detail}`).join('\n')}

Reflect the Risk Nature Classification in your summary. Write in neutral, evidence-based language. End with a recommended next step.`;
      aiSummary = await base44.integrations.Core.InvokeLLM({ prompt });
    } catch (e) {
      aiSummary = `This organization received an overall capacity score of ${scores.overallCapacityScore}/100 (${scores.riskLevel} concern). Human review is recommended.`;
    }

    await base44.entities.CapacityAssessments.create({
      organizationId: orgId,
      assessmentDate: new Date().toISOString().split('T')[0],
      staffingScore: scores.staffingScore,
      infrastructureScore: scores.infrastructureScore,
      revenueDiversityScore: scores.revenueDiversityScore,
      programExpenseScore: scores.programExpenseScore,
      dependencyScore: scores.dependencyScore,
      deliveryPlausibilityScore: scores.deliveryPlausibilityScore,
      complianceScore: scores.complianceScore,
      overallCapacityScore: scores.overallCapacityScore,
      capacityReadinessScore: scores.capacityReadinessScore,
      integrityConcernScore: scores.integrityConcernScore,
      riskLevel: scores.riskLevel,
      riskNature: scores.riskNature,
      recommendedFundingPath: scores.recommendedFundingPath,
      aiSummary,
      explanationFactors: JSON.stringify(scores.factors),
      whyThisCase: JSON.stringify(scores.whyThisCase),
      humanReviewRequired: scores.humanReviewRequired,
      reviewerStatus: scores.humanReviewRequired ? 'needs_review' : 'validated',
      benchmarkCategory: scores.riskLevel,
    });

    qc.invalidateQueries({ queryKey: ['assessments-org', orgId] });
    qc.invalidateQueries({ queryKey: ['assessments'] });
    setIsRunning(false);
  };

  if (!org) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ── TOP NAV ── */}
      <div className="flex items-center gap-2">
        <Link to="/organizations">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground">Organizations</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{org.organizationName}</span>
        <div className="flex-1" />
        <Button onClick={runAssessment} disabled={isRunning} size="sm" className="gap-2">
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? 'Running…' : latestAssessment ? 'Re-run Assessment' : 'Run Assessment'}
        </Button>
      </div>

      {/* ── ORG HEADER ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold">{org.organizationName}</h1>
              <Badge variant="secondary" className="capitalize text-xs">{org.organizationType}</Badge>
              <Badge variant="outline" className={`capitalize text-xs ${org.activeStatus === 'active' ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}>
                {org.activeStatus}
              </Badge>
              {latestAssessment && <RiskBadge level={latestAssessment.riskLevel} />}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1.5">
              {org.jurisdiction && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{org.jurisdiction}</span>}
              {org.yearFounded && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Est. {org.yearFounded}</span>}
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{org.employeeCount || 0} employees · {org.volunteerCount || 0} volunteers</span>
              {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="w-3 h-3" />{org.website}</a>}
            </div>
          </div>
        </div>

        {/* Collapsible org details */}
        {org.missionDescription && (
          <>
            <button onClick={() => setShowDetails(v => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? 'Hide details' : 'Show mission & notes'}
            </button>
            {showDetails && (
              <div className="space-y-2 pt-1 border-t border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">{org.missionDescription}</p>
                {org.notes && <p className="text-xs text-muted-foreground italic">{org.notes}</p>}
              </div>
            )}
          </>
        )}

        {/* Data availability chips */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${funding.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
            {funding.length} funding record{funding.length !== 1 ? 's' : ''}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${financials.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
            {financials.length} financial year{financials.length !== 1 ? 's' : ''}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${latestAssessment ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-muted border-border text-muted-foreground'}`}>
            {latestAssessment ? `Last assessed ${new Date(latestAssessment.assessmentDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Not yet assessed'}
          </span>
        </div>
      </div>

      {/* ── REPORT CARD ── */}
      {latestAssessment ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Assessment Report Card</h2>
          <ReportCard
            assessment={latestAssessment}
            org={org}
            funding={funding}
            financials={financials}
            onRecordDecision={() => setShowReviewDialog(true)}
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
          <Play className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">No assessment yet</p>
          <p className="text-xs text-muted-foreground">Click "Run Assessment" above to generate this organization's report card.</p>
          <Button onClick={runAssessment} disabled={isRunning} size="sm" className="gap-2 mt-2">
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Running…' : 'Run Assessment'}
          </Button>
        </div>
      )}

      {/* Review dialog */}
      {showReviewDialog && latestAssessment && (
        <InlineReviewDialog
          assessment={latestAssessment}
          org={org}
          onClose={() => setShowReviewDialog(false)}
          onSuccess={() => {
            setShowReviewDialog(false);
            qc.invalidateQueries({ queryKey: ['assessments-org', orgId] });
            qc.invalidateQueries({ queryKey: ['assessments'] });
          }}
        />
      )}
    </div>
  );
}