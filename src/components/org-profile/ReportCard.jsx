import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ClipboardCheck, ShieldAlert, HelpCircle, Zap } from 'lucide-react';
import { getRiskColor, SCORE_WEIGHTS, getScoreColor, calculateCapacityScores } from '@/lib/scoringEngine';
import { runMismatchEngine, buildMismatchInput, getMismatchStyle } from '@/lib/mismatchEngine';
import { runCredibilityEngine, buildCredibilityInput, getPatternStyle } from '@/lib/credibilityEngine';
import { runDecisionEngine, getDecisionStyle } from '@/lib/decisionEngine';
import { Button } from '@/components/ui/button';
import WhyThisCase from './WhyThisCase';

// ─── SCORE BAR ────────────────────────────────────────────────────────────────
function ScoreBar({ scoreKey, value }) {
  const [tip, setTip] = useState(false);
  const meta = SCORE_WEIGHTS[scoreKey];
  if (!meta) return null;
  const v = value ?? 0;
  const bar = v >= 68 ? 'bg-green-500' : v >= 40 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs font-medium text-foreground truncate">{meta.label}</span>
          <div className="relative flex-shrink-0">
            <button className="text-muted-foreground hover:text-foreground" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
              <HelpCircle className="w-3 h-3" />
            </button>
            {tip && (
              <div className="absolute z-50 left-5 top-0 w-64 bg-popover border border-border rounded-lg shadow-lg p-2.5 text-xs leading-relaxed">
                <p className="font-semibold mb-1">{meta.label} <span className="text-muted-foreground font-normal">({meta.pct})</span></p>
                <p className="text-muted-foreground">{meta.tooltip}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground">{meta.pct}</span>
          <span className={`text-xs font-bold tabular-nums w-7 text-right ${getScoreColor(v)}`}>{v}</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ title, badge, badgeStyle, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
        {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── MAIN REPORT CARD ─────────────────────────────────────────────────────────
export default function ReportCard({ assessment, org, funding, financials, fundingTotalAmount, onRecordDecision }) {
  const [showIndicators, setShowIndicators] = useState(false);
  const [showScoring, setShowScoring] = useState(false);

  // Run live engines from current entity data. fundingTotalAmount is the
  // authoritative server-side sum (across all paged funding rows, not just
  // the loaded page); the mismatch engine uses it as the totalRevenue
  // fallback when the entity has no T3010 filing.
  const mismatchInput = buildMismatchInput(org, financials, funding, {
    totalFundingOverride: fundingTotalAmount,
  });
  const mismatch = runMismatchEngine(mismatchInput);

  const patternInput = buildCredibilityInput(financials);
  const pattern = runCredibilityEngine(org.organizationName, patternInput);

  const decision = runDecisionEngine({
    organization_name: org.organizationName,
    mismatch_score: mismatch.mismatch_score,
    pattern_score: pattern.pattern_score,
    capacity_score: assessment?.overallCapacityScore ?? null,
    mismatch_classification: mismatch.classification,
    pattern_classification: pattern.classification,
    triggered_mismatch_rules: mismatch.triggered_rules,
    triggered_pattern_rules: pattern.triggered_rules,
  });

  const decisionStyle = getDecisionStyle(decision.classification);
  const mStyle = getMismatchStyle(mismatch.classification);
  const pStyle = getPatternStyle(pattern.classification);

  const riskColors = getRiskColor(assessment?.riskLevel || 'low');
  const overallScore = assessment?.overallCapacityScore ?? null;

  // Persisted factors (set when a reviewer ran the FE engine via "Run
  // Assessment"). Auto-v1 batch rows DON'T persist these — they only carry
  // numeric scores. So when the persisted blob is empty AND we have enough
  // inputs to recompute, run the engine live and use its factors + whyThisCase
  // for the per-org reasoning panels. Numeric scores still come from the
  // persisted record (we don't overwrite them).
  let factors = [];
  if (assessment?.explanationFactors) {
    try {
      factors = typeof assessment.explanationFactors === 'string'
        ? JSON.parse(assessment.explanationFactors)
        : (assessment.explanationFactors ?? []);
    } catch {}
  }
  let liveWhyThisCase = null;
  if (factors.length === 0 && org && (funding?.length || financials?.length)) {
    try {
      const live = calculateCapacityScores(org, funding ?? [], financials ?? [], [], null, {
        totalFundingOverride: fundingTotalAmount,
      });
      factors = live.factors ?? [];
      liveWhyThisCase = live.whyThisCase ?? null;
    } catch { /* fall through with empty factors */ }
  }
  const highFactors = factors.filter(f => f.severity === 'high');
  const otherFactors = factors.filter(f => f.severity !== 'high');

  // Build a synthesized assessment object for WhyThisCase so it can render
  // even when the persisted row carries no whyThisCase blob.
  const assessmentForWhy = (assessment && (assessment.whyThisCase || liveWhyThisCase))
    ? { ...assessment, whyThisCase: assessment.whyThisCase ?? liveWhyThisCase }
    : assessment;
  const needsReview = assessment?.humanReviewRequired &&
    (assessment?.reviewerStatus === 'needs_review' || assessment?.reviewerStatus === 'pending');

  const SCORE_KEYS = ['deliveryPlausibilityScore', 'programExpenseScore', 'staffingScore', 'revenueDiversityScore', 'infrastructureScore', 'complianceScore'];

  return (
    <div className="space-y-5">

      {/* ── REVIEWER ALERT ── */}
      {needsReview && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4">
          <ShieldAlert className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-800">Reviewer Decision Required</p>
            <p className="text-xs text-orange-700 mt-0.5">This assessment is classified as {assessment.riskLevel} concern. A documented decision is required before any funding determination.</p>
          </div>
          {onRecordDecision && (
            <Button size="sm" onClick={onRecordDecision} className="flex-shrink-0 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700">
              <ClipboardCheck className="w-3.5 h-3.5" /> Record Decision
            </Button>
          )}
        </div>
      )}

      {/* ── DECISION RECOMMENDATION ── */}
      <div className={`rounded-xl border ${decisionStyle.border} ${decisionStyle.bg} p-4 space-y-2`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 flex-shrink-0 ${decisionStyle.color}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision Engine Recommendation</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${decisionStyle.badge}`}>{decision.classification}</span>
        </div>
        <p className={`text-sm font-semibold ${decisionStyle.color}`}>{decision.recommended_action}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{decision.explanation_text}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span>Overall Risk: <strong className={decisionStyle.color}>{decision.overall_risk_level}</strong></span>
          <span>·</span>
          <span>Confidence: <strong>{decision.action_confidence}%</strong></span>
        </div>
      </div>

      {/* ── THREE SCORES IN A ROW ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Capacity Score */}
        <div className={`rounded-xl border p-3 text-center ${overallScore !== null ? riskColors.bg + ' ' + riskColors.border : 'bg-muted/40 border-border'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Capacity</p>
          <p className={`text-3xl font-bold leading-none ${overallScore !== null ? getScoreColor(overallScore) : 'text-muted-foreground'}`}>
            {overallScore ?? '–'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">/100</p>
        </div>
        {/* Mismatch Score */}
        <div className={`rounded-xl border p-3 text-center ${mStyle.bg} ${mStyle.border}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Mismatch</p>
          <p className={`text-3xl font-bold leading-none ${mStyle.text}`}>{mismatch.mismatch_score}</p>
          <p className="text-[10px] text-muted-foreground mt-1">/100</p>
        </div>
        {/* Pattern Score */}
        <div className={`rounded-xl border p-3 text-center ${pStyle.bg} ${pStyle.border}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Pattern</p>
          <p className={`text-3xl font-bold leading-none ${pStyle.text}`}>{pattern.pattern_score}</p>
          <p className="text-[10px] text-muted-foreground mt-1">/100</p>
        </div>
      </div>

      {/* ── SIGNAL PILLS ── */}
      {(mismatch.triggered_rules.length > 0 || pattern.triggered_rules.length > 0) && (
        <Section title="Active Signals">
          <div className="flex flex-wrap gap-1.5">
            {mismatch.triggered_rules.map(r => (
              <span key={r.id} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${mStyle.badge} ${mStyle.border}`}>
                ⚡ {r.label}
              </span>
            ))}
            {pattern.triggered_rules.map(r => (
              <span key={r.id} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${pStyle.badge} ${pStyle.border}`}>
                📈 {r.label}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── CAPACITY DIMENSIONS ── */}
      {assessment && (
        <Section title="Capacity Dimensions">
          <div className="space-y-2.5">
            {SCORE_KEYS.map(k => <ScoreBar key={k} scoreKey={k} value={assessment[k]} />)}
          </div>
          <p className="text-[10px] text-muted-foreground">68+ = Low concern · 40–67 = Moderate · 0–39 = High concern</p>
        </Section>
      )}

      {/* ── AI NARRATIVE ── */}
      {assessment?.aiSummary && (
        <Section title="Assessment Narrative">
          <p className="text-sm leading-relaxed text-muted-foreground">{assessment.aiSummary}</p>
        </Section>
      )}

      {/* ── WHY THIS CASE LANDED HERE ── */}
      <WhyThisCase assessment={assessmentForWhy} />

      {/* ── INDICATOR FINDINGS (collapsible) ── */}
      {factors.length > 0 && (
        <Section title="Indicator Findings">
          <button
            onClick={() => setShowIndicators(v => !v)}
            className="text-xs flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showIndicators ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showIndicators ? 'Hide' : `Show ${factors.length} indicator${factors.length > 1 ? 's' : ''}`}
          </button>
          {showIndicators && (
            <div className="space-y-1.5">
              {[...highFactors, ...otherFactors].map((f, i) => {
                const colors = { high: 'bg-red-50 border-red-200 text-red-700', moderate: 'bg-yellow-50 border-yellow-200 text-yellow-700', low: 'bg-green-50 border-green-200 text-green-700' };
                const icons = { high: AlertTriangle, moderate: AlertCircle, low: CheckCircle2 };
                const Icon = icons[f.severity] || AlertCircle;
                return (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${colors[f.severity] || colors.moderate}`}>
                    <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold uppercase tracking-wide text-[10px]">{f.area}</span>
                      <p className="mt-0.5 leading-snug">{f.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* ── HOW THIS WAS SCORED ── */}
      <Section title="How This Was Scored">
        <button
          onClick={() => setShowScoring(v => !v)}
          className="text-xs flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showScoring ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showScoring ? 'Hide scoring methodology' : 'Show scoring methodology'}
        </button>
        {showScoring && (
          <div className="space-y-3 text-xs leading-relaxed border border-border rounded-xl p-4 bg-muted/30">
            <p className="font-semibold text-foreground">Three engines combine to produce this report card:</p>

            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">1. Capacity Score <span className="font-normal text-muted-foreground">(35% of decision)</span></p>
                  <p className="text-muted-foreground">Six weighted dimensions — Delivery Plausibility (25%), Program Spending (25%), Staffing (20%), Revenue Diversity (15%), Infrastructure (10%), Compliance (5%) — scored 0–100 and saved to this assessment record.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">2. Mismatch Score <span className="font-normal text-muted-foreground">(35% of decision)</span></p>
                  <p className="text-muted-foreground">Checks for internal contradictions in the submitted data: compensation without staff, funding without program activity, weak governance relative to funding size, and program claims without an operational footprint. Each triggered rule adds 25 points (max 100).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">3. Pattern Score <span className="font-normal text-muted-foreground">(30% of decision)</span></p>
                  <p className="text-muted-foreground">Analyses multi-year financial history (requires at least 2 years of data) for sustained patterns: sustained zero program activity, declining program spend, funding growth without activity growth, and persistently low program ratios.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-1">
              <p className="font-semibold text-foreground">Decision Engine composite formula:</p>
              <p className="text-muted-foreground font-mono bg-background rounded-md px-3 py-1.5 text-[11px]">
                Composite Risk = (Mismatch × 35%) + (Pattern × 30%) + ((100 − Capacity) × 35%)
              </p>
              <p className="text-muted-foreground">A higher composite risk score → higher concern classification. The Decision Engine recommendation and confidence level are both derived from this composite.</p>
            </div>

            {assessment?.benchmarkCategory && (
              <div className="border-t border-border pt-3 space-y-1">
                <p className="font-semibold text-foreground">Benchmark Applied: <span className="font-normal text-primary">{assessment.benchmarkCategory}</span></p>
                <p className="text-muted-foreground">A category benchmark was matched to this organization's type and applied as score modifiers before the final roll-up. Modifiers appear as individual indicator findings tagged with the benchmark name. You can review and change benchmark mappings on the Benchmarks page.</p>
              </div>
            )}
            {!assessment?.benchmarkCategory && (
              <div className="border-t border-border pt-3 space-y-1">
                <p className="font-semibold text-foreground">Benchmarks:</p>
                <p className="text-muted-foreground">No benchmark profile was mapped to this organization's type at the time of assessment. You can configure Benchmark Mappings on the Benchmarks page — re-running the assessment will then apply the matched benchmark as score modifiers.</p>
              </div>
            )}
          </div>
        )}
      </Section>

      <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
        This report card is generated from structured indicators. It is advisory only and does not constitute a determination of misconduct or non-compliance. All funding decisions require a documented reviewer decision.
      </p>
    </div>
  );
}