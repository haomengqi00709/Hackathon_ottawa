/**
 * Action Layer — Decision Engine
 * Proof of Capacity Engine
 *
 * Translates analytical signals (mismatch + pattern scores) into clear,
 * actionable recommendations for government decision-makers.
 *
 * All outputs are framed as "risk-informed decision support" —
 * not determinations of fraud or misconduct.
 */

// ─── CLASSIFICATION CONFIG ─────────────────────────────────────────────────────
export const DECISION_CLASSIFICATIONS = {
  'Healthy / Ready': {
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
    bar: 'bg-green-500',
    dot: 'bg-green-500',
    emoji: '✅',
    riskColor: 'text-green-600',
  },
  'Underdeveloped': {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    bar: 'bg-blue-500',
    dot: 'bg-blue-500',
    emoji: '🌱',
    riskColor: 'text-blue-600',
  },
  'Overstretched': {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    bar: 'bg-orange-500',
    dot: 'bg-orange-500',
    emoji: '⚠️',
    riskColor: 'text-orange-600',
  },
  'High Concern': {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    bar: 'bg-red-500',
    dot: 'bg-red-500',
    emoji: '🚨',
    riskColor: 'text-red-600',
  },
};

const ACTION_MAP = {
  'Healthy / Ready':  'Proceed with funding as planned',
  'Underdeveloped':   'Provide capacity-building support or smaller initial funding',
  'Overstretched':    'Adjust funding level or implement staged/milestone-based funding',
  'High Concern':     'Escalate for enhanced review or audit prior to funding decision',
};

const CLASSIFICATION_STATEMENTS = {
  'Healthy / Ready':  'No significant inconsistencies or concerning patterns were detected.',
  'Underdeveloped':   'This organization shows some inconsistencies but does not demonstrate sustained high-risk patterns.',
  'Overstretched':    'This organization shows sustained patterns indicating that current funding levels may exceed operational capacity.',
  'High Concern':     'This organization shows strong and repeated signals of mismatch between reported capacity and financial activity.',
};

// ─── CORE ENGINE ──────────────────────────────────────────────────────────────
/**
 * @param {Object} input
 * @param {string} input.organization_name
 * @param {number} input.mismatch_score        0–100
 * @param {number} input.pattern_score         0–100
 * @param {string} input.mismatch_classification
 * @param {string} input.pattern_classification
 * @param {Array}  input.triggered_mismatch_rules
 * @param {Array}  input.triggered_pattern_rules
 */
export function runDecisionEngine(input) {
  const {
    organization_name = 'Unknown Organization',
    mismatch_score = 0,
    pattern_score = 0,
    triggered_mismatch_rules = [],
    triggered_pattern_rules = [],
  } = input;

  const ms = Math.max(0, Math.min(100, mismatch_score));
  const ps = Math.max(0, Math.min(100, pattern_score));

  // ─── STEP 1: OVERALL RISK LEVEL ─────────────────────────────────────────
  let overall_risk_level;
  if (ms >= 75 || ps >= 75) {
    overall_risk_level = 'High';
  } else if (ms >= 25 || ps >= 25) {
    overall_risk_level = 'Moderate';
  } else {
    overall_risk_level = 'Low';
  }

  // ─── STEP 2: CLASSIFICATION ──────────────────────────────────────────────
  let classification;
  if (overall_risk_level === 'Low') {
    classification = 'Healthy / Ready';
  } else if (overall_risk_level === 'Moderate' && ps < 50) {
    classification = 'Underdeveloped';
  } else if (overall_risk_level === 'Moderate' && ps >= 50) {
    classification = 'Overstretched';
  } else {
    classification = 'High Concern';
  }

  // ─── STEP 3: ACTION MAPPING ──────────────────────────────────────────────
  const recommended_action = ACTION_MAP[classification];

  // ─── STEP 4: ACTION CONFIDENCE ───────────────────────────────────────────
  const action_confidence = Math.min(100, Math.round((ms + ps) / 2));

  // ─── STEP 5: EXPLANATION ENGINE ──────────────────────────────────────────
  const parts = [CLASSIFICATION_STATEMENTS[classification]];

  const mismatchSignals = (triggered_mismatch_rules || []).slice(0, 2);
  const patternSignals = (triggered_pattern_rules || []).slice(0, 2);

  if (mismatchSignals.length > 0) {
    const labels = mismatchSignals.map(r => r.label || r.id || r).join(' and ');
    parts.push(`Internal data signals flagged: ${labels}.`);
  }

  if (patternSignals.length > 0) {
    const labels = patternSignals.map(r => r.label || r.id || r).join(' and ');
    parts.push(`Multi-year pattern signals flagged: ${labels}.`);
  }

  parts.push(`Recommended action: ${recommended_action}.`);

  const explanation_text = parts.join(' ');

  return {
    organization_name,
    mismatch_score: ms,
    pattern_score: ps,
    overall_risk_level,
    classification,
    recommended_action,
    action_confidence,
    explanation_text,
  };
}

export function getDecisionStyle(classification) {
  return DECISION_CLASSIFICATIONS[classification] || {
    color: 'text-muted-foreground',
    bg: 'bg-muted/40',
    border: 'border-border',
    badge: 'bg-muted text-muted-foreground',
    bar: 'bg-muted-foreground',
    dot: 'bg-muted-foreground',
    emoji: '–',
    riskColor: 'text-muted-foreground',
  };
}