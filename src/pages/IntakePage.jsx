import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList, Upload, ChevronRight, ChevronLeft,
  Building2, DollarSign, BarChart2, FileText,
  CheckCircle2, Loader2, AlertCircle, FileUp
} from 'lucide-react';

const STEPS = [
  { id: 'org',       label: 'Organization',  icon: Building2 },
  { id: 'funding',   label: 'Funding',        icon: DollarSign },
  { id: 'financials',label: 'Financials',     icon: BarChart2 },
  { id: 'notes',     label: 'Notes & Submit', icon: FileText },
];

const EMPTY_ORG = {
  organizationName: '', organizationType: 'nonprofit', registrationNumber: '',
  jurisdiction: '', activeStatus: 'active', website: '',
  physicalPresenceStatus: 'unknown', address: '', employeeCount: '',
  volunteerCount: '', yearFounded: '', missionDescription: '',
};

const EMPTY_FUNDING = {
  fundingProgramName: '', fundingSource: '', fiscalYear: '',
  fundingAmount: '', fundingPurpose: '', expectedDeliverables: '',
  reportingPeriodMonths: '12', renewalEligible: true,
};

const EMPTY_FINANCIALS = {
  fiscalYear: '', totalRevenue: '', governmentRevenue: '', earnedRevenue: '',
  donationsRevenue: '', otherRevenue: '', totalExpenses: '',
  compensationExpense: '', programExpense: '', transferToOtherEntities: '',
  adminExpense: '', latestFilingStatus: 'current',
};

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active ? 'bg-primary text-primary-foreground' :
              done   ? 'text-green-600' : 'text-muted-foreground'
            }`}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function OrgStep({ form, update }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label>Organization Name *</Label>
        <Input required value={form.organizationName} onChange={e => update('organizationName', e.target.value)} placeholder="e.g. Northbridge Youth Futures" />
      </div>
      <div>
        <Label>Organization Type *</Label>
        <Select value={form.organizationType} onValueChange={v => update('organizationType', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nonprofit">Nonprofit</SelectItem>
            <SelectItem value="charity">Charity</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="cooperative">Cooperative</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Registration Number</Label>
        <Input value={form.registrationNumber} onChange={e => update('registrationNumber', e.target.value)} placeholder="e.g. ON-2022-004512" />
      </div>
      <div>
        <Label>Jurisdiction</Label>
        <Input value={form.jurisdiction} onChange={e => update('jurisdiction', e.target.value)} placeholder="e.g. Ontario" />
      </div>
      <div>
        <Label>Active Status</Label>
        <Select value={form.activeStatus} onValueChange={v => update('activeStatus', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="dissolved">Dissolved</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Physical Presence</Label>
        <Select value={form.physicalPresenceStatus} onValueChange={v => update('physicalPresenceStatus', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="limited">Limited</SelectItem>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label>Address</Label>
        <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street address or PO Box" />
      </div>
      <div>
        <Label>Website</Label>
        <Input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <Label>Year Founded</Label>
        <Input type="number" value={form.yearFounded} onChange={e => update('yearFounded', e.target.value)} placeholder="e.g. 2018" />
      </div>
      <div>
        <Label>Employees</Label>
        <Input type="number" value={form.employeeCount} onChange={e => update('employeeCount', e.target.value)} placeholder="Full-time equivalents" />
      </div>
      <div>
        <Label>Volunteers</Label>
        <Input type="number" value={form.volunteerCount} onChange={e => update('volunteerCount', e.target.value)} placeholder="Active volunteers" />
      </div>
      <div className="md:col-span-2">
        <Label>Mission / Program Description</Label>
        <Textarea value={form.missionDescription} onChange={e => update('missionDescription', e.target.value)} rows={3} placeholder="Describe what this organization does and who it serves" />
      </div>
    </div>
  );
}

function FundingStep({ form, update }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <p className="md:col-span-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        Enter the most recent or current funding arrangement. Additional records can be added from the organization profile after intake.
      </p>
      <div className="md:col-span-2">
        <Label>Funding Program Name *</Label>
        <Input required value={form.fundingProgramName} onChange={e => update('fundingProgramName', e.target.value)} placeholder="e.g. Youth Opportunity Fund" />
      </div>
      <div>
        <Label>Funding Source</Label>
        <Input value={form.fundingSource} onChange={e => update('fundingSource', e.target.value)} placeholder="e.g. Employment and Social Development Canada" />
      </div>
      <div>
        <Label>Fiscal Year</Label>
        <Input value={form.fiscalYear} onChange={e => update('fiscalYear', e.target.value)} placeholder="e.g. 2024-25" />
      </div>
      <div>
        <Label>Funding Amount ($)</Label>
        <Input type="number" value={form.fundingAmount} onChange={e => update('fundingAmount', e.target.value)} placeholder="e.g. 450000" />
      </div>
      <div>
        <Label>Reporting Period (months)</Label>
        <Input type="number" value={form.reportingPeriodMonths} onChange={e => update('reportingPeriodMonths', e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label>Funding Purpose</Label>
        <Textarea value={form.fundingPurpose} onChange={e => update('fundingPurpose', e.target.value)} rows={2} placeholder="What was this funding intended to support?" />
      </div>
      <div className="md:col-span-2">
        <Label>Expected Deliverables</Label>
        <Textarea value={form.expectedDeliverables} onChange={e => update('expectedDeliverables', e.target.value)} rows={2} placeholder="What outcomes or outputs is the organization expected to produce?" />
      </div>
      <div className="md:col-span-2">
        <Label>Renewal Eligible?</Label>
        <Select value={form.renewalEligible ? 'yes' : 'no'} onValueChange={v => update('renewalEligible', v === 'yes')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FinancialsStep({ form, update }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <p className="md:col-span-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        Enter the most recent full fiscal year financial data. All figures in CAD. Fields left blank will be treated as zero.
      </p>
      <div>
        <Label>Fiscal Year</Label>
        <Input value={form.fiscalYear} onChange={e => update('fiscalYear', e.target.value)} placeholder="e.g. 2024-25" />
      </div>
      <div>
        <Label>Filing Status</Label>
        <Select value={form.latestFilingStatus} onValueChange={v => update('latestFilingStatus', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current (filed on time)</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2 border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Revenue</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Total Revenue ($)</Label><Input type="number" value={form.totalRevenue} onChange={e => update('totalRevenue', e.target.value)} placeholder="0" /></div>
          <div><Label>Government Revenue ($)</Label><Input type="number" value={form.governmentRevenue} onChange={e => update('governmentRevenue', e.target.value)} placeholder="0" /></div>
          <div><Label>Earned Revenue ($)</Label><Input type="number" value={form.earnedRevenue} onChange={e => update('earnedRevenue', e.target.value)} placeholder="0" /></div>
          <div><Label>Donations ($)</Label><Input type="number" value={form.donationsRevenue} onChange={e => update('donationsRevenue', e.target.value)} placeholder="0" /></div>
          <div><Label>Other Revenue ($)</Label><Input type="number" value={form.otherRevenue} onChange={e => update('otherRevenue', e.target.value)} placeholder="0" /></div>
        </div>
      </div>
      <div className="md:col-span-2 border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Expenses</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Total Expenses ($)</Label><Input type="number" value={form.totalExpenses} onChange={e => update('totalExpenses', e.target.value)} placeholder="0" /></div>
          <div><Label>Compensation ($)</Label><Input type="number" value={form.compensationExpense} onChange={e => update('compensationExpense', e.target.value)} placeholder="0" /></div>
          <div><Label>Program Delivery ($)</Label><Input type="number" value={form.programExpense} onChange={e => update('programExpense', e.target.value)} placeholder="0" /></div>
          <div><Label>Transfers to Other Entities ($)</Label><Input type="number" value={form.transferToOtherEntities} onChange={e => update('transferToOtherEntities', e.target.value)} placeholder="0" /></div>
          <div><Label>Admin / Overhead ($)</Label><Input type="number" value={form.adminExpense} onChange={e => update('adminExpense', e.target.value)} placeholder="0" /></div>
        </div>
      </div>
    </div>
  );
}

function NotesStep({ notes, setNotes }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Submitting Department / Agency</Label>
        <Input value={notes.submitter} onChange={e => setNotes(p => ({ ...p, submitter: e.target.value }))} placeholder="e.g. ESDC — Grants and Contributions Directorate" />
      </div>
      <div>
        <Label>Reason for Intake</Label>
        <Select value={notes.reason} onValueChange={v => setNotes(p => ({ ...p, reason: v }))}>
          <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="renewal_review">Renewal review</SelectItem>
            <SelectItem value="new_applicant">New applicant screening</SelectItem>
            <SelectItem value="complaint">Third-party complaint received</SelectItem>
            <SelectItem value="audit_flag">Audit flag / referral</SelectItem>
            <SelectItem value="routine_monitoring">Routine monitoring cycle</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Additional Notes</Label>
        <Textarea value={notes.text} onChange={e => setNotes(p => ({ ...p, text: e.target.value }))} rows={4} placeholder="Include any additional context, concerns, or observations relevant to this submission..." />
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 leading-relaxed">
        <strong>What happens next:</strong> Once submitted, this organization will be added to the system and can have a Capacity Assessment run immediately from its profile page. The assessment engine will score it across all capacity dimensions and route it to the Review Queue if indicators of concern are detected.
      </div>
    </div>
  );
}

// ─── File Upload Mode ────────────────────────────────────────────────────────

function FileUploadMode({ onImported }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'parsing' | 'preview' | 'importing' | 'done' | 'error'
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStatus('parsing');
    setError('');

    const text = await f.text();
    let rows = [];

    if (f.name.endsWith('.json')) {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } else if (f.name.endsWith('.csv')) {
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
    } else {
      setStatus('error');
      setError('Unsupported file type. Please upload a .json or .csv file.');
      return;
    }

    // Map to org records
    const mapped = rows.map(r => ({
      organizationName: r.organizationName || r.name || r.organization_name || '',
      organizationType: r.organizationType || r.type || 'nonprofit',
      registrationNumber: r.registrationNumber || r.registration_number || '',
      jurisdiction: r.jurisdiction || '',
      activeStatus: r.activeStatus || r.active_status || 'active',
      website: r.website || '',
      physicalPresenceStatus: r.physicalPresenceStatus || r.physical_presence || 'unknown',
      address: r.address || '',
      employeeCount: Number(r.employeeCount || r.employees || 0) || undefined,
      volunteerCount: Number(r.volunteerCount || r.volunteers || 0) || undefined,
      yearFounded: Number(r.yearFounded || r.year_founded || 0) || undefined,
      missionDescription: r.missionDescription || r.mission || '',
      notes: r.notes || '',
    })).filter(r => r.organizationName);

    if (!mapped.length) {
      setStatus('error');
      setError('No valid organization records found. Ensure the file has an "organizationName" (or "name") column/field.');
      return;
    }

    setPreview(mapped);
    setStatus('preview');
  };

  const handleImport = async () => {
    setStatus('importing');
    for (const org of preview) {
      await base44.entities.Organizations.create(org);
    }
    qc.invalidateQueries({ queryKey: ['orgs'] });
    setStatus('done');
  };

  if (status === 'done') {
    return (
      <div className="text-center py-12 space-y-3">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h3 className="font-semibold text-lg">Import Complete</h3>
        <p className="text-sm text-muted-foreground">{preview.length} organization{preview.length > 1 ? 's' : ''} added to the system.</p>
        <Button onClick={() => navigate('/organizations')} className="mt-2">View Organizations</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
        <FileUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">Upload a CSV or JSON file</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Accepted columns: <code className="bg-muted px-1 rounded">organizationName</code>, <code className="bg-muted px-1 rounded">organizationType</code>, <code className="bg-muted px-1 rounded">jurisdiction</code>, <code className="bg-muted px-1 rounded">employees</code>, <code className="bg-muted px-1 rounded">activeStatus</code>, and more.
        </p>
        <label className="cursor-pointer">
          <input type="file" accept=".csv,.json" className="hidden" onChange={handleFile} />
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Upload className="w-4 h-4" /> Choose File
          </span>
        </label>
        {file && <p className="text-xs text-muted-foreground mt-2">{file.name}</p>}
      </div>

      {status === 'parsing' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Parsing file...
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {status === 'preview' && preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{preview.length} organization{preview.length > 1 ? 's' : ''} detected</p>
            <Button onClick={handleImport} disabled={status === 'importing'} className="gap-2">
              {status === 'importing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import All
            </Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {['Name', 'Type', 'Jurisdiction', 'Status', 'Employees'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/40">
                      <td className="px-3 py-2 font-medium">{r.organizationName}</td>
                      <td className="px-3 py-2 capitalize">{r.organizationType}</td>
                      <td className="px-3 py-2">{r.jurisdiction || '—'}</td>
                      <td className="px-3 py-2 capitalize">{r.activeStatus}</td>
                      <td className="px-3 py-2">{r.employeeCount ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function IntakePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState('manual'); // 'manual' | 'upload'
  const [step, setStep] = useState(0);

  const [orgForm, setOrgForm]         = useState({ ...EMPTY_ORG });
  const [fundingForm, setFundingForm] = useState({ ...EMPTY_FUNDING });
  const [finForm, setFinForm]         = useState({ ...EMPTY_FINANCIALS });
  const [notes, setNotes]             = useState({ submitter: '', reason: '', text: '' });
  const [submitting, setSubmitting]   = useState(false);

  const updateOrg     = (k, v) => setOrgForm(p     => ({ ...p, [k]: v }));
  const updateFunding = (k, v) => setFundingForm(p => ({ ...p, [k]: v }));
  const updateFin     = (k, v) => setFinForm(p     => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 0) return orgForm.organizationName.trim().length > 0;
    if (step === 1) return fundingForm.fundingProgramName.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // 1. Create organization
    const orgData = { ...orgForm };
    if (orgData.employeeCount) orgData.employeeCount = Number(orgData.employeeCount);
    if (orgData.volunteerCount) orgData.volunteerCount = Number(orgData.volunteerCount);
    if (orgData.yearFounded) orgData.yearFounded = Number(orgData.yearFounded);
    if (notes.text) orgData.notes = `[${notes.submitter || 'Intake'}${notes.reason ? ` · ${notes.reason}` : ''}] ${notes.text}`;

    const newOrg = await base44.entities.Organizations.create(orgData);

    // 2. Create funding record if name provided
    if (fundingForm.fundingProgramName.trim()) {
      const fd = { ...fundingForm, organizationId: newOrg.id };
      if (fd.fundingAmount) fd.fundingAmount = Number(fd.fundingAmount);
      if (fd.reportingPeriodMonths) fd.reportingPeriodMonths = Number(fd.reportingPeriodMonths);
      await base44.entities.FundingRecords.create(fd);
    }

    // 3. Create financial indicators if year provided
    if (finForm.fiscalYear.trim()) {
      const fi = { ...finForm, organizationId: newOrg.id };
      ['totalRevenue','governmentRevenue','earnedRevenue','donationsRevenue','otherRevenue',
       'totalExpenses','compensationExpense','programExpense','transferToOtherEntities','adminExpense'
      ].forEach(k => { if (fi[k]) fi[k] = Number(fi[k]); });
      await base44.entities.FinancialIndicators.create(fi);
    }

    qc.invalidateQueries({ queryKey: ['orgs'] });
    navigate(`/organizations/${newOrg.id}`);
  };

  const stepContent = [
    <OrgStep      key="org"      form={orgForm}     update={updateOrg}     />,
    <FundingStep  key="funding"  form={fundingForm} update={updateFunding} />,
    <FinancialsStep key="fin"   form={finForm}      update={updateFin}     />,
    <NotesStep    key="notes"   notes={notes}       setNotes={setNotes}    />,
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intake Submission</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Submit an organization for capacity review — manually or via file upload</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${mode === 'manual' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
        >
          <ClipboardList className="w-4 h-4" /> Manual Entry
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${mode === 'upload' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
        >
          <Upload className="w-4 h-4" /> File Upload
        </button>
      </div>

      {mode === 'upload' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" /> Bulk File Import</CardTitle>
            <CardDescription>Upload a CSV or JSON file containing one or more organization records. Ideal for competition datasets or agency exports.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadMode />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <StepIndicator steps={STEPS} current={step} />
            <Badge variant="secondary" className="text-xs">{step + 1} of {STEPS.length}</Badge>
          </div>

          {/* Step card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {React.createElement(STEPS[step].icon, { className: 'w-4 h-4' })}
                {STEPS[step].label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stepContent[step]}
            </CardContent>
          </Card>

          {/* Nav buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => step === 0 ? navigate('/organizations') : setStep(s => s - 1)} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}