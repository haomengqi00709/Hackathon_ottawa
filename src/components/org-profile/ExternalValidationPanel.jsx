import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import {
  Globe, MapPin, Loader2, ShieldCheck, AlertTriangle,
  RefreshCw, CheckCircle2, XCircle, AlertCircle, Info
} from 'lucide-react';

function PresenceScoreBar({ score }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 45 ? 'bg-yellow-400' : score >= 20 ? 'bg-orange-400' : 'bg-red-500';
  const textColor = score >= 70 ? 'text-green-700' : score >= 45 ? 'text-yellow-700' : score >= 20 ? 'text-orange-700' : 'text-red-700';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Presence Score</span>
        <span className={`text-sm font-bold ${textColor}`}>{score}/100</span>
      </div>
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">0–19 = Minimal · 20–44 = Low · 45–69 = Moderate · 70–100 = Strong</p>
    </div>
  );
}

function SignalRow({ icon: Icon, label, value, subtext, status }) {
  const statusConfig = {
    good:    { bg: 'bg-green-50  border-green-200',  text: 'text-green-700',  icon: CheckCircle2 },
    warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', icon: AlertCircle },
    bad:     { bg: 'bg-red-50    border-red-200',     text: 'text-red-700',    icon: XCircle },
    neutral: { bg: 'bg-muted/40  border-border',      text: 'text-muted-foreground', icon: Info },
  };
  const cfg = statusConfig[status] || statusConfig.neutral;
  const StatusIcon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{label}</span>
          <span className={`text-xs font-medium ${cfg.text}`}>{value}</span>
        </div>
        {subtext && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{subtext}</p>}
      </div>
      <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.text}`} />
    </div>
  );
}

function websiteStatusLevel(status) {
  if (!status || status === 'No website') return 'bad';
  if (status === 'Active and credible') return 'good';
  if (status === 'Active — bot-protected') return 'good';
  if (status === 'Active — limited content') return 'warning';
  return 'bad';
}

function addressStatusLevel(isValid, locationType) {
  if (!isValid) return 'bad';
  if (locationType === 'Commercial') return 'good';
  if (locationType === 'Residential') return 'warning';
  return 'neutral';
}

function presenceLabelStatus(label) {
  if (!label) return 'neutral';
  if (label.includes('Strong')) return 'good';
  if (label.includes('Moderate')) return 'warning';
  return 'bad';
}

export default function ExternalValidationPanel({ org, cachedResult, onResultSaved }) {
  const [result, setResult] = useState(cachedResult || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('validateExternalPresence', {
        organizationName: org.organizationName,
        address: org.address || '',
        city: '',
        province: org.jurisdiction || '',
        website: org.website || '',
      });
      setResult(res.data);
      if (onResultSaved) onResultSaved(res.data);
    } catch (e) {
      setError('Validation could not be completed. Please try again.');
    }
    setLoading(false);
  };

  const hasAddress = org.address || org.jurisdiction;
  const hasWebsite = !!org.website;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              External Validation Layer
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Enriches internal data with lightweight external signals — website reachability and address plausibility. Used as a supporting indicator only.
            </p>
          </div>
          <Button
            size="sm"
            variant={result ? 'outline' : 'default'}
            onClick={runValidation}
            disabled={loading}
            className="gap-1.5 flex-shrink-0 text-xs"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : result ? <RefreshCw className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {loading ? 'Validating…' : result ? 'Re-validate' : 'Run External Validation'}
          </Button>
        </div>

        {/* What will be checked */}
        {!result && !loading && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${hasWebsite ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-muted text-muted-foreground border-border'}`}>
              <Globe className="w-3 h-3" />
              {hasWebsite ? `Website: ${org.website}` : 'No website on record'}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${hasAddress ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-muted text-muted-foreground border-border'}`}>
              <MapPin className="w-3 h-3" />
              {hasAddress ? `Address: ${[org.address, org.jurisdiction].filter(Boolean).join(', ')}` : 'No address on record'}
            </span>
          </div>
        )}
      </CardHeader>

      {error && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        </CardContent>
      )}

      {result && !loading && (
        <CardContent className="pt-0 space-y-4">

          {/* Presence Score */}
          <PresenceScoreBar score={result.presenceScore} />

          {/* Label */}
          <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${
            presenceLabelStatus(result.presenceLabel) === 'good' ? 'bg-green-50 border-green-200' :
            presenceLabelStatus(result.presenceLabel) === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <span className="text-sm font-semibold">{result.presenceLabel}</span>
          </div>

          {/* Signal rows */}
          <div className="space-y-2">
            <SignalRow
              icon={Globe}
              label="Website"
              value={result.websiteStatus}
              subtext={result.websiteDetail}
              status={websiteStatusLevel(result.websiteStatus)}
            />
            <SignalRow
              icon={MapPin}
              label="Address"
              value={result.isValidAddress
                ? `Verified — ${result.locationType}`
                : 'Could not be geocoded'}
              subtext={result.addressDetail}
              status={addressStatusLevel(result.isValidAddress, result.locationType)}
            />
          </div>

          {/* Explanation */}
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Plain-Language Assessment</p>
            <p className="text-sm leading-relaxed text-foreground">{result.explanationText}</p>
          </div>

          {/* Signal feed notice */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              These signals feed into the next capacity assessment as supporting indicators:&nbsp;
              <strong>Infrastructure Capacity</strong> (presence score) and&nbsp;
              <strong>Verifiability Gap</strong> (inverted presence score).
              They do not override any internal data signal.
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}