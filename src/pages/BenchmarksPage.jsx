import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SCORE_WEIGHTS } from '@/lib/scoringEngine';

// The actual thresholds hardcoded in the scoring engine — displayed for transparency
const SCORING_RULES = [
  {
    dimension: 'Staffing Adequacy',
    weight: '20%',
    description: 'Evaluates whether staffing levels are plausible given the funding amount.',
    thresholds: [
      { condition: '0 employees + funding > $500k', score: '10', severity: 'high', note: 'No workforce to deliver this level of programming.' },
      { condition: '0 employees + funding $150k–$500k', score: '35', severity: 'high', note: 'Even volunteer-only operations at this scale are unusual.' },
      { condition: '>$600k funding per employee', score: '30', severity: 'high', note: 'Delivery capacity is likely insufficient.' },
      { condition: '$300k–$600k per employee', score: '55', severity: 'moderate', note: 'Staffing is relatively thin.' },
      { condition: '$150k–$300k per employee', score: '75', severity: 'low', note: 'Staffing appears proportionate.' },
      { condition: '<$150k per employee', score: '90', severity: 'low', note: 'Strong staffing-to-funding ratio.' },
    ],
  },
  {
    dimension: 'Delivery Plausibility',
    weight: '25%',
    description: 'Compares claimed deliverables against observable capacity (staff, funding).',
    thresholds: [
      { condition: '0 employees + funding >$150k + large deliverables', score: '10', severity: 'high', note: 'No visible workforce to execute deliverables.' },
      { condition: '>500 participants per employee', score: '20', severity: 'high', note: 'Ratio is implausible for direct service delivery.' },
      { condition: '150–500 participants per employee', score: '45', severity: 'moderate', note: 'Plausible only with strong infrastructure.' },
      { condition: '<150 participants per employee', score: '80', severity: 'low', note: 'Within a plausible range.' },
      { condition: 'Funding >$500k + <5 total staff + large deliverables', score: '35', severity: 'high', note: 'Delivery capacity appears strained.' },
      { condition: 'Funding ≤$200k (small org)', score: '80', severity: 'low', note: 'Funding scale and scope appear proportionate.' },
    ],
  },
  {
    dimension: 'Program Spending',
    weight: '25%',
    description: 'Measures what proportion of total expenses reaches program delivery.',
    thresholds: [
      { condition: 'Program expense ratio < 20%', score: '15', severity: 'high', note: 'Well below benchmarks — serious questions about fund utilization.' },
      { condition: 'Program expense ratio 20–35%', score: '38', severity: 'moderate', note: 'Below the expected 40–55% minimum.' },
      { condition: 'Program expense ratio 35–50%', score: '65', severity: 'moderate', note: 'Acceptable but worth monitoring.' },
      { condition: 'Program expense ratio > 50%', score: '88', severity: 'low', note: 'Most funding reaches intended delivery.' },
      { condition: 'Compensation ratio > 70%', score: '≤25 (cap)', severity: 'high', note: 'Minimal resources remain for actual program delivery.' },
      { condition: 'Pass-through transfers > 30%', score: 'Flag', severity: 'moderate', note: 'Warrants tracing of recipient organizations.' },
    ],
  },
  {
    dimension: 'Revenue Diversity',
    weight: '15%',
    description: 'Flags near-total dependence on a single government funder.',
    thresholds: [
      { condition: 'Government revenue > 95%', score: '12', severity: 'high', note: 'Near-total dependency — limited independent accountability.' },
      { condition: 'Government revenue 80–95%', score: '35', severity: 'high', note: 'Exceeds the 80% threshold. High concentration risk.' },
      { condition: 'Government revenue 60–80%', score: '60', severity: 'moderate', note: 'Elevated but within a manageable range.' },
      { condition: 'Government revenue < 60%', score: '90', severity: 'low', note: 'Revenue is well-diversified.' },
    ],
  },
  {
    dimension: 'Infrastructure & Status',
    weight: '10%',
    description: 'Checks whether the organization has a verifiable physical presence and is legally active.',
    thresholds: [
      { condition: 'Status = dissolved or inactive', score: '5', severity: 'high', note: 'Must not be receiving active public funding.' },
      { condition: 'Physical presence = none', score: '20', severity: 'high', note: 'No verifiable operational base.' },
      { condition: 'Physical presence = unknown', score: '45', severity: 'moderate', note: 'Further due diligence recommended.' },
      { condition: 'Physical presence = limited', score: '65', severity: 'low', note: 'Sufficient for small programs.' },
      { condition: 'Physical presence = confirmed', score: '90', severity: 'low', note: 'Operational base is verifiable.' },
    ],
  },
  {
    dimension: 'Compliance & Reporting',
    weight: '5%',
    description: 'Reflects whether financial filings are current and timely.',
    thresholds: [
      { condition: 'Filings = missing', score: '10', severity: 'high', note: 'All financial claims are unverifiable.' },
      { condition: 'Filings = late', score: '50', severity: 'moderate', note: 'Basic accountability requirement not met.' },
      { condition: 'Filings = unknown', score: '55', severity: 'moderate', note: 'Recommend requesting statements directly.' },
      { condition: 'Filings = current', score: '85', severity: 'low', note: 'No compliance issues identified.' },
    ],
  },
];

const severityStyle = {
  high:     'bg-red-50 text-red-700 border-red-200',
  moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low:      'bg-green-50 text-green-700 border-green-200',
};

const severityDot = {
  high: 'bg-red-500',
  moderate: 'bg-yellow-500',
  low: 'bg-green-500',
};

export default function BenchmarksPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({
    benchmarkCategory: '', minimumExpectedEmployees: '', minimumInfrastructureLevel: 'light',
    expectedProgramExpenseRatio: '', maxGovernmentDependencyRatio: '', notes: ''
  });

  const { data: benchmarks = [] } = useQuery({ queryKey: ['benchmarks'], queryFn: () => base44.entities.Benchmarks.list() });

  const save = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        minimumExpectedEmployees: Number(form.minimumExpectedEmployees) || 0,
        expectedProgramExpenseRatio: Number(form.expectedProgramExpenseRatio) || 0,
        maxGovernmentDependencyRatio: Number(form.maxGovernmentDependencyRatio) || 0,
      };
      if (dialog === 'new') await base44.entities.Benchmarks.create(data);
      else await base44.entities.Benchmarks.update(dialog, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['benchmarks'] }); setDialog(null); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Benchmarks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['benchmarks'] }),
  });

  const openEdit = (b) => {
    setForm({
      benchmarkCategory: b.benchmarkCategory, minimumExpectedEmployees: b.minimumExpectedEmployees || '',
      minimumInfrastructureLevel: b.minimumInfrastructureLevel || 'light',
      expectedProgramExpenseRatio: b.expectedProgramExpenseRatio || '',
      maxGovernmentDependencyRatio: b.maxGovernmentDependencyRatio || '', notes: b.notes || ''
    });
    setDialog(b.id);
  };

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scoring Benchmarks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          These are the exact thresholds the assessment engine uses to score every organization. Scores are rule-based and applied consistently to all assessments.
        </p>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          The thresholds below are <strong>active scoring rules</strong> — they drive every capacity assessment in this system. They are displayed here for transparency and reviewer understanding. Custom benchmark notes can be added in the section below.
        </p>
      </div>

      {/* Scoring rules — one card per dimension */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Active Scoring Dimensions</h2>
        {SCORING_RULES.map((rule) => (
          <Card key={rule.dimension}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">{rule.dimension}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                </div>
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full flex-shrink-0">{rule.weight} weight</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-1/2">Condition</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-16">Score</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Severity</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Reviewer Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rule.thresholds.map((t, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-xs text-foreground">{t.condition}</td>
                        <td className="px-3 py-2 font-bold text-sm">{t.score}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${severityStyle[t.severity]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${severityDot[t.severity]}`} />
                            {t.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{t.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Layer 2 Classification thresholds */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Layer 2: Risk Nature Classification Rules</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            After the overall score is calculated, a second layer classifies <em>why</em> the risk exists using Capacity Readiness and Integrity Concern sub-scores.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Classification</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Capacity Readiness</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Integrity Concern</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Recommended Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold text-green-700">✅ Ready</td>
                  <td className="px-3 py-2 text-xs font-mono">≥ 75</td>
                  <td className="px-3 py-2 text-xs font-mono">&lt; 25</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Approve as requested</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold text-red-700">🚨 High Concern</td>
                  <td className="px-3 py-2 text-xs font-mono">&lt; 35 (if IC ≥ 40)</td>
                  <td className="px-3 py-2 text-xs font-mono">≥ 50</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Escalate to enhanced review</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold text-orange-700">⚠️ Overstretched</td>
                  <td className="px-3 py-2 text-xs font-mono">40–65</td>
                  <td className="px-3 py-2 text-xs font-mono">20–45</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Approve with milestones</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold text-blue-700">🌱 Emerging but Underdeveloped</td>
                  <td className="px-3 py-2 text-xs font-mono">&lt; 65</td>
                  <td className="px-3 py-2 text-xs font-mono">&lt; 35</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Refer to capacity-building stream</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Custom Benchmarks (admin notes) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Custom Benchmark Notes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Optional notes and category-specific thresholds added by reviewers. These are for reference only and do not affect scoring.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setForm({ benchmarkCategory: '', minimumExpectedEmployees: '', minimumInfrastructureLevel: 'light', expectedProgramExpenseRatio: '', maxGovernmentDependencyRatio: '', notes: '' }); setDialog('new'); }}>
            <Plus className="w-4 h-4" /> Add Note
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Category</TableHead>
                  <TableHead>Min. Employees</TableHead>
                  <TableHead>Infrastructure</TableHead>
                  <TableHead>Program Expense</TableHead>
                  <TableHead>Max Govt Dependency</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.benchmarkCategory}</TableCell>
                    <TableCell>{b.minimumExpectedEmployees || '—'}</TableCell>
                    <TableCell className="capitalize">{b.minimumInfrastructureLevel || '—'}</TableCell>
                    <TableCell>{b.expectedProgramExpenseRatio ? `${Math.round(b.expectedProgramExpenseRatio * 100)}%` : '—'}</TableCell>
                    <TableCell>{b.maxGovernmentDependencyRatio ? `${Math.round(b.maxGovernmentDependencyRatio * 100)}%` : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{b.notes || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(b.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {benchmarks.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No custom notes added yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === 'new' ? 'Add' : 'Edit'} Custom Benchmark Note</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category Name *</Label><Input value={form.benchmarkCategory} onChange={e => setForm(p => ({ ...p, benchmarkCategory: e.target.value }))} placeholder="e.g. Large Direct-Service Nonprofit" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min. Employees</Label><Input type="number" value={form.minimumExpectedEmployees} onChange={e => setForm(p => ({ ...p, minimumExpectedEmployees: e.target.value }))} /></div>
              <div><Label>Infrastructure Level</Label>
                <Select value={form.minimumInfrastructureLevel} onValueChange={v => setForm(p => ({ ...p, minimumInfrastructureLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="significant">Significant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Expected Program Expense Ratio</Label><Input type="number" step="0.01" min="0" max="1" value={form.expectedProgramExpenseRatio} onChange={e => setForm(p => ({ ...p, expectedProgramExpenseRatio: e.target.value }))} placeholder="e.g. 0.65" /></div>
              <div><Label>Max Govt Dependency Ratio</Label><Input type="number" step="0.01" min="0" max="1" value={form.maxGovernmentDependencyRatio} onChange={e => setForm(p => ({ ...p, maxGovernmentDependencyRatio: e.target.value }))} placeholder="e.g. 0.80" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Add any context or justification for these thresholds..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button disabled={!form.benchmarkCategory || save.isPending} onClick={() => save.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}