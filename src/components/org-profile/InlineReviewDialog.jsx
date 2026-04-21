import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RiskBadge from '@/components/shared/RiskBadge';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Info, ShieldAlert, ShieldCheck } from 'lucide-react';

const DECISION_OPTIONS = [
  {
    group: 'Confirm AI Finding',
    icon: ShieldAlert,
    iconClass: 'text-red-500',
    options: [
      { value: 'do_not_renew',        label: 'Do Not Renew',               desc: 'Capacity concerns are significant enough to recommend non-renewal.' },
      { value: 'further_review',      label: 'Escalate for Further Review', desc: 'Concern confirmed — requires additional investigation before a final decision.' },
      { value: 'conditional_funding', label: 'Conditional Funding',         desc: 'Funding may proceed, but with explicit conditions tied to identified capacity gaps.' },
    ]
  },
  {
    group: 'Modify AI Finding',
    icon: ShieldCheck,
    iconClass: 'text-yellow-500',
    options: [
      { value: 'monitor',    label: 'Monitor',               desc: 'Downgrade the risk — the organization shows some concern but does not require immediate action.' },
      { value: 'no_concern', label: 'No Concern (Override)',  desc: 'Override the AI assessment entirely. Override rationale is required.' },
    ]
  },
];

const DECISION_STATUS_MAP = {
  no_concern:          'validated',
  monitor:             'watchlist',
  conditional_funding: 'needs_review',
  further_review:      'needs_review',
  do_not_renew:        'closed',
};

const IS_OVERRIDE = { no_concern: true, monitor: true };

export default function InlineReviewDialog({ assessment, org, onClose, onSuccess }) {
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

  const submit = useMutation({
    mutationFn: async () => {
      await base44.entities.ReviewDecisions.create({
        organizationId: assessment.organizationId,
        assessmentId: assessment.id,
        reviewerName: form.reviewerName,
        decisionDate: new Date().toISOString().split('T')[0],
        finalDecision: form.finalDecision,
        rationale: form.rationale,
        overrideReason: form.overrideReason || '',
        followUpAction: form.followUpAction,
      });
      await base44.entities.CapacityAssessments.update(assessment.id, {
        reviewerStatus: DECISION_STATUS_MAP[form.finalDecision] || 'needs_review',
      });
    },
    onSuccess,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" /> Human Review — {org?.organizationName}
          </DialogTitle>
          <DialogDescription>
            Record a formal review decision. This will be permanently logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        {/* AI summary */}
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI / Rules-Based Finding</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{assessment.overallCapacityScore}/100</span>
              <RiskBadge level={assessment.riskLevel} />
            </div>
          </div>
          {assessment.aiSummary && <p className="text-xs text-muted-foreground leading-relaxed">{assessment.aiSummary}</p>}
          {highFactors.length > 0 && (
            <div className="space-y-1">
              {highFactors.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700"><strong>{f.area}:</strong> {f.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Reviewer Name <span className="text-destructive">*</span></Label>
            <Input placeholder="Full name" value={form.reviewerName} onChange={e => setForm(p => ({ ...p, reviewerName: e.target.value }))} />
          </div>

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

          {isOverride && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 space-y-1.5">
              <Label className="text-yellow-800">Override Rationale <span className="text-destructive">*</span></Label>
              <p className="text-xs text-yellow-700 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Explain specifically what evidence justifies departing from the system's recommendation.
              </p>
              <Textarea value={form.overrideReason} onChange={e => setForm(p => ({ ...p, overrideReason: e.target.value }))} rows={3}
                placeholder="e.g. Site visit confirmed an active office and staff not reflected in registry..." />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Decision Rationale <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">(min. 20 characters)</span></Label>
            <Textarea value={form.rationale} onChange={e => setForm(p => ({ ...p, rationale: e.target.value }))} rows={4}
              placeholder="Provide a clear, documented rationale. This record will be retained for audit purposes..." />
          </div>

          <div className="space-y-1.5">
            <Label>Follow-up Actions <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={form.followUpAction} onChange={e => setForm(p => ({ ...p, followUpAction: e.target.value }))} rows={2}
              placeholder="e.g. Request updated staffing roster by June 30..." />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!isValid || submit.isPending} onClick={() => submit.mutate()} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {submit.isPending ? 'Saving...' : 'Submit & Log Decision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}