import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Users, Sliders } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration, scoring methodology, and access controls</p>
      </div>

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
              <p className="text-xs text-green-600 mt-1">No human review required</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Moderate</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">40–69</p>
              <p className="text-xs text-yellow-600 mt-1">Human review recommended</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">High Concern</p>
              <p className="text-2xl font-bold text-red-700 mt-1">0–39</p>
              <p className="text-xs text-red-600 mt-1">Human review required</p>
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
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Key Rules</CardTitle>
          <CardDescription>Transparent rules that drive the scoring model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Zero employees + high funding → sharply reduce staffing score</p>
            <p>• No physical presence → reduce infrastructure score</p>
            <p>• Government dependency &gt; 80% → high dependency risk</p>
            <p>• Program expense ratio very low → reduce delivery plausibility</p>
            <p>• Compensation &gt; 70% of expenses → raise concern</p>
            <p>• Missing financial filings → reduce confidence</p>
            <p>• Inactive/dissolved status → major warning</p>
            <p>• High transfer ratio → flag possible pass-through</p>
            <p>• Large deliverables + minimal staff → reduce plausibility</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> User Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg border">
              <p className="font-medium text-sm">Analyst</p>
              <p className="text-xs text-muted-foreground">Create records, upload evidence, run assessments, add notes</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium text-sm">Reviewer</p>
              <p className="text-xs text-muted-foreground">Review flagged cases, confirm or override scores, record decisions</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium text-sm">Admin</p>
              <p className="text-xs text-muted-foreground">Full access, manage scoring thresholds, benchmarks, and users</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}