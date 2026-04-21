import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import RiskBadge from '@/components/shared/RiskBadge';
import { ArrowRight, ClipboardCheck, Filter, AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, ShieldX, Info } from 'lucide-react';

const STATUS_LABELS = {
  pending: 'Pending',
  needs_review: 'Needs Review',
  validated: 'Validated',
  watchlist: 'Watchlist',
  closed: 'Closed',
};

const STATUS_STYLES = {
  pending:      'bg-blue-50 text-blue-700 border-blue-200',
  needs_review: 'bg-orange-50 text-orange-700 border-orange-200',
  validated:    'bg-green-50 text-green-700 border-green-200',
  watchlist:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  closed:       'bg-muted text-muted-foreground border-border',
};

// Decision options — grouped by type for the reviewer
const DECISION_OPTIONS = [
{
  group: 'Concur with Assessment Finding',
  icon: ShieldAlert,
  iconClass: 'text-red-500',
  options: [
    { value: 'do_not_renew',       label: 'Do Not Renew',                  desc: 'Concur with the assessment finding. Identified capacity indicators are insufficient to support renewal recommendation.' },
    { value: 'further_review',     label: 'Refer for Further Review',       desc: 'Concur that concern exists. Additional enquiry or documentation is required before a final determination.' },
    { value: 'conditional_funding',label: 'Conditional Continuation',       desc: 'Funding may continue subject to explicit conditions addressing identified capacity shortfalls.' },
  ]
},
{
  group: 'Depart from Assessment Finding',
  icon: ShieldCheck,
  iconClass: 'text-yellow-500',
  options: [
    { value: 'monitor',            label: 'Monitor — Reduced Concern',      desc: 'Reviewer determines that concern is present but does not warrant the assessed classification. Ongoing monitoring is appropriate.' },
    { value: 'no_concern',         label: 'No Concern — Assessment Override', desc: 'Reviewer determines the assessment does not reflect available evidence. A documented override rationale is required.' },
  ]
},
];

const DECISION_STATUS_MAP = {
  no_concern:         'validated',
  monitor:            'watchlist',
  conditional_funding:'needs_review',
  further_review:     'needs_review',
  do_not_renew:       'closed',
};

// Whether this decision overrides the AI (requires extra rationale)
const IS_OVERRIDE = { no_concern: true, monitor: true };

function ReviewDialog({ assessment, org, onClose, onSubmit, isPending }) {
  const [form, setForm] = useState({
    reviewerName: '',
    finalDecision: '',
    rationale: '',
    overrideReason: '',
    followUpAction: '',
  });

  const isOverride = IS_OVERRIDE[form.finalDecision];
  const isValid = form.reviewerName.trim() && form.finalDecision &&
    form.rationale.trim().length >= 20 &&
    (!isOverride || form.overrideReason.trim().length >= 20);

  let factors = [];
  try { factors = JSON.parse(assessment.explanationFactors || '[]'); } catch {}
  const highFactors = factors.filter(f => f.severity === 'high');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Reviewer Decision — {org?.organizationName}
          </DialogTitle>
          <DialogDescription>
            Record a formal reviewer decision. This entry will be retained as part of the permanent audit trail.
          </DialogDescription>
        </DialogHeader>

        {/* AI Assessment Summary */}
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI / Rules-Based Finding</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{assessment.overallCapacityScore}/100</span>
              <RiskBadge level={assessment.riskLevel} size="sm" />
            </div>
          </div>
          {assessment.aiSummary && (
            <p className="text-sm text-muted-foreground leading-relaxed">{assessment.aiSummary}</p>
          )}
          {highFactors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Factors rated high concern:</p>
              {highFactors.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700"><strong>{f.area}:</strong> {f.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Reviewer name */}
          <div className="space-y-1.5">
            <Label>Reviewer Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Full name of the reviewer"
              value={form.reviewerName}
              onChange={e => setForm(p => ({ ...p, reviewerName: e.target.value }))}
            />
          </div>

          {/* Decision — grouped */}
          <div className="space-y-1.5">
            <Label>Review Decision <span className="text-destructive">*</span></Label>
            <div className="space-y-3">
              {DECISION_OPTIONS.map(group => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.group}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <GroupIcon className={`w-3.5 h-3.5 ${group.iconClass}`} /> {group.group}
                    </p>
                    <div className="space-y-1.5">
                      {group.options.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setForm(p => ({ ...p, finalDecision: opt.value }))}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                            form.finalDecision === opt.value
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border bg-card hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{opt.label}</span>
                            {IS_OVERRIDE[opt.value] && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Override</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Override rationale — only shown when overriding */}
          {isOverride && (
            <div className="space-y-1.5 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <Label className="text-yellow-800">
                Override Rationale <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-yellow-700 mb-1.5 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                The selected decision departs from the system-generated finding. Please document the specific evidence or professional judgment that supports this determination.
              </p>
              <Textarea
                value={form.overrideReason}
                onChange={e => setForm(p => ({ ...p, overrideReason: e.target.value }))}
                rows={3}
                placeholder="e.g. Site visit conducted [date] confirmed operational premises and staffing not reflected in registry records. Documentary evidence reviewed and retained on file..."
              />
            </div>
          )}

          {/* Primary rationale */}
          <div className="space-y-1.5">
            <Label>
              Decision Rationale <span className="text-destructive">*</span>
              <span className="font-normal text-muted-foreground ml-1">(min. 20 characters)</span>
            </Label>
            <Textarea
              value={form.rationale}
              onChange={e => setForm(p => ({ ...p, rationale: e.target.value }))}
              rows={4}
              placeholder="Provide a clear and documented basis for this decision. This record will be retained in the audit trail and may be subject to further review..."
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-1.5">
            <Label>Follow-up Actions <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={form.followUpAction}
              onChange={e => setForm(p => ({ ...p, followUpAction: e.target.value }))}
              rows={2}
              placeholder="e.g. Request updated staffing register by [date]. Schedule compliance site visit in Q3. Obtain audited financial statements for current fiscal year..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!isValid || isPending}
            onClick={() => onSubmit(form)}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPending ? 'Saving...' : 'Submit & Log Decision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReviewQueue() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('needs_review');
  const [reviewDialog, setReviewDialog] = useState(null);

  const { data: assessments = [] } = useQuery({ queryKey: ['assessments'], queryFn: () => base44.entities.CapacityAssessments.list() });
  const { data: orgs = [] } = useQuery({ queryKey: ['orgs'], queryFn: () => base44.entities.Organizations.list() });
  const { data: reviews = [] } = useQuery({ queryKey: ['reviews'], queryFn: () => base44.entities.ReviewDecisions.list() });

  const orgMap = {};
  orgs.forEach(o => { orgMap[o.id] = o; });

  // Count latest review per assessment
  const reviewCountByAssessment = {};
  reviews.forEach(r => {
    reviewCountByAssessment[r.assessmentId] = (reviewCountByAssessment[r.assessmentId] || 0) + 1;
  });

  const queue = assessments
    .filter(a => a.humanReviewRequired)
    .filter(a => statusFilter === 'all' || a.reviewerStatus === statusFilter)
    .sort((a, b) => a.overallCapacityScore - b.overallCapacityScore);

  // Summary counts
  const allFlagged = assessments.filter(a => a.humanReviewRequired);
  const pendingCount = allFlagged.filter(a => a.reviewerStatus === 'needs_review' || a.reviewerStatus === 'pending').length;
  const watchlistCount = allFlagged.filter(a => a.reviewerStatus === 'watchlist').length;
  const closedCount = allFlagged.filter(a => a.reviewerStatus === 'closed' || a.reviewerStatus === 'validated').length;

  const submitReview = useMutation({
    mutationFn: async (form) => {
      const a = reviewDialog;
      await base44.entities.ReviewDecisions.create({
        organizationId: a.organizationId,
        assessmentId: a.id,
        reviewerName: form.reviewerName,
        decisionDate: new Date().toISOString().split('T')[0],
        finalDecision: form.finalDecision,
        rationale: form.rationale,
        overrideReason: form.overrideReason || '',
        followUpAction: form.followUpAction,
      });
      await base44.entities.CapacityAssessments.update(a.id, {
        reviewerStatus: DECISION_STATUS_MAP[form.finalDecision] || 'needs_review',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
      setReviewDialog(null);
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviewer Decision Queue</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Assessments classified as moderate or high concern require a documented reviewer decision before any funding determination is made.
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Decision', value: pendingCount, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Under Monitoring', value: watchlistCount, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Decision Recorded', value: closedCount, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className={`text-3xl font-bold leading-none mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="needs_review">Awaiting Decision</SelectItem>
            <SelectItem value="pending">Pending Assessment</SelectItem>
            <SelectItem value="watchlist">Under Monitoring</SelectItem>
            <SelectItem value="validated">Reviewed — No Concern</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{queue.length} record{queue.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Queue items */}
      <div className="space-y-3">
        {queue.map(a => {
          const org = orgMap[a.organizationId];
          let factors = [];
          try { factors = JSON.parse(a.explanationFactors || '[]'); } catch {}
          const highFactors = factors.filter(f => f.severity === 'high');
          const priorReviews = reviewCountByAssessment[a.id] || 0;

          return (
            <Card key={a.id} className={a.riskLevel === 'high' ? 'border-red-200' : a.riskLevel === 'moderate' ? 'border-yellow-200' : ''}>
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Score block */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 bg-background"
                    style={{ borderColor: a.overallCapacityScore >= 68 ? '#22c55e' : a.overallCapacityScore >= 40 ? '#eab308' : '#ef4444' }}>
                    <span className={`text-2xl font-bold leading-none ${a.overallCapacityScore >= 68 ? 'text-green-600' : a.overallCapacityScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {a.overallCapacityScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground">/100</span>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/organizations/${a.organizationId}`} className="font-semibold text-sm hover:underline">
                        {org?.organizationName || 'Unknown'}
                      </Link>
                      <RiskBadge level={a.riskLevel} />
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[a.reviewerStatus] || ''}`}>
                        {STATUS_LABELS[a.reviewerStatus] || a.reviewerStatus}
                      </span>
                      {priorReviews > 0 && (
                        <span className="text-[10px] text-muted-foreground">{priorReviews} prior review{priorReviews > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {a.aiSummary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.aiSummary}</p>
                    )}

                    {highFactors.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {highFactors.slice(0, 4).map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle className="w-2.5 h-2.5" /> {f.area}
                          </span>
                        ))}
                      </div>
                    )}

                    {a.assessmentDate && (
                      <p className="text-[11px] text-muted-foreground">
                        Assessed {new Date(a.assessmentDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setReviewDialog(a)}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Record Decision
                    </Button>
                    <Link to={`/organizations/${a.organizationId}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs w-full">
                        View Profile <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {queue.length === 0 && (
          <Card>
            <CardContent className="py-14 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">No records in this category</p>
              <p className="text-xs text-muted-foreground">Adjust the status filter to view records in other categories.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      {reviewDialog && (
        <ReviewDialog
          assessment={reviewDialog}
          org={orgMap[reviewDialog.organizationId]}
          onClose={() => setReviewDialog(null)}
          onSubmit={(form) => submitReview.mutate(form)}
          isPending={submitReview.isPending}
        />
      )}
    </div>
  );
}