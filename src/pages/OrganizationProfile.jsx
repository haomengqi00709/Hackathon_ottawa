import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import OrgHeader from '@/components/org-profile/OrgHeader';
import AssessmentPanel from '@/components/org-profile/AssessmentPanel';
import FundingPanel from '@/components/org-profile/FundingPanel';
import FinancialsPanel from '@/components/org-profile/FinancialsPanel';
import EvidencePanel from '@/components/org-profile/EvidencePanel';
import ReviewHistoryPanel from '@/components/org-profile/ReviewHistoryPanel';
import { calculateCapacityScores } from '@/lib/scoringEngine';

export default function OrganizationProfile() {
  const { id: orgId } = useParams();
  const qc = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const { data: org } = useQuery({ queryKey: ['org', orgId], queryFn: async () => {
    const orgs = await base44.entities.Organizations.filter({ id: orgId });
    return orgs[0];
  }, enabled: !!orgId });

  const { data: funding = [] } = useQuery({ queryKey: ['funding', orgId], queryFn: () => base44.entities.FundingRecords.filter({ organizationId: orgId }) });
  const { data: financials = [] } = useQuery({ queryKey: ['financials', orgId], queryFn: () => base44.entities.FinancialIndicators.filter({ organizationId: orgId }) });
  const { data: evidence = [] } = useQuery({ queryKey: ['evidence', orgId], queryFn: () => base44.entities.EvidenceItems.filter({ organizationId: orgId }) });
  const { data: assessments = [] } = useQuery({ queryKey: ['assessments-org', orgId], queryFn: () => base44.entities.CapacityAssessments.filter({ organizationId: orgId }) });
  const { data: decisions = [] } = useQuery({ queryKey: ['decisions', orgId], queryFn: () => base44.entities.ReviewDecisions.filter({ organizationId: orgId }) });

  const latestAssessment = assessments.sort((a, b) => new Date(b.assessmentDate) - new Date(a.assessmentDate))[0];

  const runAssessment = async () => {
    if (!org) return;
    setIsRunning(true);

    const scores = calculateCapacityScores(org, funding, financials, []);
    
    // Generate AI summary
    let aiSummary = '';
    try {
      const highFactors = scores.factors.filter(f => f.severity === 'high');
      const modFactors = scores.factors.filter(f => f.severity === 'moderate');
      const prompt = `You are a capacity assessment analyst for public-sector funding oversight. Write a 2-3 sentence neutral, professional summary for a human reviewer about this organization.

Organization: ${org.organizationName} (${org.organizationType})
Overall Capacity Score: ${scores.overallCapacityScore}/100
Risk Level: ${scores.riskLevel}
Key findings:
${scores.factors.map(f => `- [${f.severity.toUpperCase()}] ${f.area}: ${f.detail}`).join('\n')}

Write in neutral, evidence-based language. This is an early-warning assessment, not a fraud determination. End with a brief recommended next step for the reviewer.`;

      aiSummary = await base44.integrations.Core.InvokeLLM({ prompt });
    } catch (e) {
      aiSummary = `This organization received an overall capacity score of ${scores.overallCapacityScore}/100 (${scores.riskLevel} concern). ${scores.factors.filter(f => f.severity === 'high').map(f => f.detail).join(' ')} Human review is recommended.`;
    }

    const assessmentData = {
      organizationId: orgId,
      assessmentDate: new Date().toISOString().split('T')[0],
      staffingScore: scores.staffingScore,
      infrastructureScore: scores.infrastructureScore,
      revenueDiversityScore: scores.revenueDiversityScore,
      programExpenseScore: scores.programExpenseScore,
      dependencyScore: scores.dependencyScore,
      deliveryPlausibilityScore: scores.deliveryPlausibilityScore,
      overallCapacityScore: scores.overallCapacityScore,
      riskLevel: scores.riskLevel,
      aiSummary,
      explanationFactors: JSON.stringify(scores.factors),
      humanReviewRequired: scores.humanReviewRequired,
      reviewerStatus: scores.humanReviewRequired ? 'needs_review' : 'validated',
    };

    await base44.entities.CapacityAssessments.create(assessmentData);
    qc.invalidateQueries({ queryKey: ['assessments-org', orgId] });
    qc.invalidateQueries({ queryKey: ['assessments'] });
    setIsRunning(false);
  };

  if (!org) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/organizations"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1" />
        <Button onClick={runAssessment} disabled={isRunning} className="gap-2">
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Running Assessment...' : 'Run Capacity Assessment'}
        </Button>
      </div>

      <OrgHeader org={org} assessment={latestAssessment} />

      <Tabs defaultValue="assessment">
        <TabsList>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="funding">Funding ({funding.length})</TabsTrigger>
          <TabsTrigger value="financials">Financials ({financials.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({decisions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="assessment" className="mt-4">
          {latestAssessment ? <AssessmentPanel assessment={latestAssessment} /> : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No assessment has been run yet.</p>
              <p className="text-xs mt-1">Click "Run Capacity Assessment" to generate a score.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="funding" className="mt-4"><FundingPanel records={funding} /></TabsContent>
        <TabsContent value="financials" className="mt-4"><FinancialsPanel records={financials} /></TabsContent>
        <TabsContent value="evidence" className="mt-4"><EvidencePanel items={evidence} /></TabsContent>
        <TabsContent value="reviews" className="mt-4"><ReviewHistoryPanel decisions={decisions} /></TabsContent>
      </Tabs>
    </div>
  );
}