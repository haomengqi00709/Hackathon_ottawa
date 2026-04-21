import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import RiskBadge from '@/components/shared/RiskBadge';
import ScoreGauge from '@/components/shared/ScoreGauge';
import { ArrowRight, ClipboardCheck, Filter } from 'lucide-react';

export default function ReviewQueue() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewForm, setReviewForm] = useState({ finalDecision: 'monitor', rationale: '', followUpAction: '', reviewerName: '' });

  const { data: assessments = [] } = useQuery({ queryKey: ['assessments'], queryFn: () => base44.entities.CapacityAssessments.list() });
  const { data: orgs = [] } = useQuery({ queryKey: ['orgs'], queryFn: () => base44.entities.Organizations.list() });

  const orgMap = {};
  orgs.forEach(o => { orgMap[o.id] = o; });

  const queue = assessments
    .filter(a => a.humanReviewRequired)
    .filter(a => statusFilter === 'all' || a.reviewerStatus === statusFilter)
    .sort((a, b) => a.overallCapacityScore - b.overallCapacityScore);

  const submitReview = useMutation({
    mutationFn: async () => {
      const a = reviewDialog;
      await base44.entities.ReviewDecisions.create({
        organizationId: a.organizationId,
        assessmentId: a.id,
        reviewerName: reviewForm.reviewerName,
        decisionDate: new Date().toISOString().split('T')[0],
        finalDecision: reviewForm.finalDecision,
        rationale: reviewForm.rationale,
        followUpAction: reviewForm.followUpAction,
      });
      await base44.entities.CapacityAssessments.update(a.id, {
        reviewerStatus: reviewForm.finalDecision === 'no_concern' ? 'validated' :
          reviewForm.finalDecision === 'do_not_renew' ? 'closed' :
          reviewForm.finalDecision === 'monitor' ? 'watchlist' : 'needs_review'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
      setReviewDialog(null);
      setReviewForm({ finalDecision: 'monitor', rationale: '', followUpAction: '', reviewerName: '' });
    },
  });

  const statusLabels = { pending: 'Pending', needs_review: 'Needs Review', validated: 'Validated', watchlist: 'Watchlist', closed: 'Closed' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted-foreground">Cases requiring human review and decision</p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="watchlist">Watchlist</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{queue.length} cases</Badge>
      </div>

      <div className="space-y-3">
        {queue.map(a => {
          const org = orgMap[a.organizationId];
          let factors = [];
          try { factors = JSON.parse(a.explanationFactors || '[]'); } catch {}
          const highFactors = factors.filter(f => f.severity === 'high');

          return (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <ScoreGauge score={a.overallCapacityScore} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link to={`/organizations/${a.organizationId}`} className="font-semibold text-sm hover:underline">
                        {org?.organizationName || 'Unknown'}
                      </Link>
                      <RiskBadge level={a.riskLevel} />
                      <Badge variant="outline" className="text-[10px]">{statusLabels[a.reviewerStatus]}</Badge>
                    </div>
                    {a.aiSummary && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.aiSummary}</p>}
                    {highFactors.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {highFactors.slice(0, 3).map((f, i) => (
                          <Badge key={i} variant="destructive" className="text-[10px] font-normal bg-red-100 text-red-700 border-0">{f.area}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link to={`/organizations/${a.organizationId}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">View <ArrowRight className="w-3 h-3" /></Button>
                    </Link>
                    <Button size="sm" className="gap-1 text-xs" onClick={() => setReviewDialog(a)}>
                      <ClipboardCheck className="w-3 h-3" /> Record Decision
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {queue.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No cases in queue</CardContent></Card>
        )}
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Review Decision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Reviewer Name</Label><Input value={reviewForm.reviewerName} onChange={e => setReviewForm(p => ({ ...p, reviewerName: e.target.value }))} /></div>
            <div><Label>Decision</Label>
              <Select value={reviewForm.finalDecision} onValueChange={v => setReviewForm(p => ({ ...p, finalDecision: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_concern">No Concern</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="conditional_funding">Conditional Funding</SelectItem>
                  <SelectItem value="further_review">Further Review</SelectItem>
                  <SelectItem value="do_not_renew">Do Not Renew</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Rationale *</Label><Textarea value={reviewForm.rationale} onChange={e => setReviewForm(p => ({ ...p, rationale: e.target.value }))} rows={3} placeholder="Explain the reasoning behind your decision..." /></div>
            <div><Label>Follow-up Action</Label><Textarea value={reviewForm.followUpAction} onChange={e => setReviewForm(p => ({ ...p, followUpAction: e.target.value }))} rows={2} placeholder="Any follow-up steps required?" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button disabled={!reviewForm.rationale || submitReview.isPending} onClick={() => submitReview.mutate()}>Submit Decision</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}