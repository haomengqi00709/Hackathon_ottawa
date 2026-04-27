import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, Users, Sliders, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function ApiUrlCard() {
  const [url, setUrl] = useState(() => localStorage.getItem('api_url') || '');
  const [saved, setSaved] = useState(localStorage.getItem('api_url') || '');
  const [status, setStatus] = useState(null); // null | 'testing' | 'ok' | 'error'

  const handleSave = () => {
    const trimmed = url.trim().replace(/\/$/, '');
    localStorage.setItem('api_url', trimmed);
    setSaved(trimmed);
    setStatus(null);
  };

  const handleTest = async () => {
    const base = url.trim().replace(/\/$/, '') || 'http://localhost:8000';
    setStatus('testing');
    try {
      const r = await fetch(`${base}/api/engine/organizations?limit=1`);
      setStatus(r.ok ? 'ok' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const handleReset = () => {
    localStorage.removeItem('api_url');
    setUrl('');
    setSaved('');
    setStatus(null);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="w-4 h-4" /> Data API Connection
        </CardTitle>
        <CardDescription>
          Set the URL of the FastAPI backend (e.g. your ngrok tunnel). Leave blank to use <code className="text-xs bg-muted px-1 rounded">localhost:8000</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://xxxx.ngrok-free.app"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="font-mono text-sm"
          />
          <Button onClick={handleSave} disabled={url.trim() === saved}>Save</Button>
          <Button variant="outline" onClick={handleTest}>
            {status === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {status === 'ok' && <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-700 font-medium">Connected — API is reachable</span></>}
          {status === 'error' && <><XCircle className="w-4 h-4 text-red-600" /><span className="text-red-700 font-medium">Connection failed — check the URL and that the server is running</span></>}
          {status === null && saved && <><CheckCircle2 className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Saved: <code className="bg-muted px-1 rounded">{saved}</code></span></>}
          {status === null && !saved && <span className="text-muted-foreground">Using default: <code className="bg-muted px-1 rounded">http://localhost:8000</code></span>}
        </div>

        {saved && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={handleReset}>
            Reset to localhost
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration, scoring methodology, and access controls</p>
      </div>

      <ApiUrlCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sliders className="w-4 h-4" /> Risk Classification Thresholds</CardTitle>
          <CardDescription>Score ranges used to determine capacity concern levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Low Concern</p>
              <p className="text-2xl font-bold text-green-700 mt-1">70–100</p>
              <p className="text-xs text-green-600 mt-1">No reviewer action required</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Moderate Concern</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">40–69</p>
              <p className="text-xs text-yellow-600 mt-1">Documented reviewer decision required</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">High Concern</p>
              <p className="text-2xl font-bold text-red-700 mt-1">0–39</p>
              <p className="text-xs text-red-600 mt-1">Documented reviewer decision required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Score Component Weights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Staffing Adequacy', weight: '20%' },
              { label: 'Infrastructure Presence', weight: '15%' },
              { label: 'Revenue Diversity', weight: '15%' },
              { label: 'Program Expense Ratio', weight: '20%' },
              { label: 'Government Dependency', weight: '10%' },
              { label: 'Delivery Plausibility', weight: '20%' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">{s.label}</span>
                <Badge variant="secondary">{s.weight}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Automated Scoring Rules</CardTitle>
          <CardDescription>Documented rules that drive the capacity scoring model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Zero reported employees relative to funding level — staffing score reduced significantly</p>
            <p>• No confirmed physical presence — infrastructure score reduced</p>
            <p>• Government revenue dependency exceeding 80% — dependency indicator flagged</p>
            <p>• Program expense ratio materially below sector norms — delivery plausibility score reduced</p>
            <p>• Compensation exceeding 70% of total expenses — concern indicator raised</p>
            <p>• Missing or overdue financial filings — scoring confidence reduced</p>
            <p>• Organization status recorded as inactive or dissolved — major risk flag applied</p>
            <p>• High inter-entity transfer ratio — possible pass-through structure flagged</p>
            <p>• Large stated deliverables relative to reported staffing — delivery plausibility score reduced</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Access Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg border">
              <p className="font-medium text-sm">Analyst</p>
              <p className="text-xs text-muted-foreground">Create and maintain organization records, upload evidence, initiate capacity assessments, and add notes</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium text-sm">Reviewer</p>
              <p className="text-xs text-muted-foreground">Review flagged assessments, record formal decisions, and override automated findings with documented rationale</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium text-sm">Admin</p>
              <p className="text-xs text-muted-foreground">Full system access including management of scoring thresholds, benchmarks, and user permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}