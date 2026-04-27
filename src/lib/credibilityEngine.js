/**
 * Pattern Over Time — Credibility Engine
 * Proof of Capacity Engine
 *
 * Analyzes multi-year organizational data to detect sustained behavioral
 * patterns. Distinguishes one-off anomalies from consistent signals.
 *
 * All outputs are framed as "patterns" and "signals" — not determinations
 * of misconduct or fraud.
 */

// ─── RULE DEFINITIONS ─────────────────────────────────────────────────────────
export const CREDIBILITY_RULES = {
  multi_year_zero_programs: {
    id: 'multi_year_zero_programs',
    label: 'Sustained Zero Program Activity',
    description: 'This organization has reported little or no program activity across multiple years.',
    detail: 'Program spend at or below 1% was recorded in 3 or more years. A pattern of near-zero program activity across multiple reporting periods is a strong signal that warrants reviewer attention.',
    weight: 25,
  },
  declining_program_spend: {
    id: 'declining_program_spend',
    label: 'Declining Program Activity',
    description: 'Program spending has declined over time, suggesting reduced operational activity.',
    detail: 'Program spend percentage shows a sustained downward trend across available years. Declining program ratios over time may indicate a gradual shift away from delivery activity.',
    weight: 25,
  },
  funding_without_activity_growth: {
    id: 'funding_without_activity_growth',
    label: 'Funding Without Activity Growth',
    description: 'Funding levels remain stable or are increasing, but program activity has not increased accordingly.',
    detail: 'Revenue is stable or growing while program spend percentage remains at or below 10%. Growing resources without proportionate program delivery is a notable inconsistency.',
    weight: 25,
  },
  persistently_low_program_activity: {
    id: 'persistently_low_program_activity',
    label: 'Persistently Low Program Activity',
    description: 'Program spending remains consistently low relative to total funding.',
    detail: 'Average program spend across 3 or more years is at or below 10%. Persistent low program ratios across multiple years suggest a structural rather than situational pattern.',
    weight: 25,
  },
};

// ─── CORE ENGINE ──────────────────────────────────────────────────────────────
/**
 * @param {string} organizationName
 * @param {Array<{ year: number, program_spend_percentage: number, total_revenue: number, government_funding_percentage: number }>} yearlyRecords
 */
export function runCredibilityEngine(organizationName, yearlyRecords) {
  if (!yearlyRecords || yearlyRecords.length === 0) {
    return {
      organization_name: organizationName,
      years_of_data: 0,
      pattern_score: 0,
      classification: 'Insufficient data',
      triggered_rules: [],
      explanation_text: 'Insufficient multi-year data to assess patterns for this organization.',
      trend: {
        program_trend_direction: 'Unknown',
        avg_program_spend: null,
        zero_program_years: 0,
        revenue_trend: 'Unknown',
        first_year: null,
        last_year: null,
      },
    };
  }

  // ─── STEP 1: SORT BY YEAR ────────────────────────────────────────────────
  const sorted = [...yearlyRecords].sort((a, b) => (a.year || 0) - (b.year || 0));
  const years_of_data = sorted.length;

  // ─── STEP 2: DERIVED METRICS ─────────────────────────────────────────────
  const programSpends = sorted.map(r => r.program_spend_percentage || 0);
  const revenues = sorted.map(r => r.total_revenue || 0);

  const zero_program_years = programSpends.filter(p => p <= 1).length;
  const avg_program_spend = programSpends.reduce((s, v) => s + v, 0) / years_of_data;

  // Revenue trend: first vs last
  const firstRevenue = revenues[0];
  const lastRevenue = revenues[years_of_data - 1];
  let revenue_trend = 'Stable';
  if (firstRevenue > 0) {
    const revenueChange = (lastRevenue - firstRevenue) / firstRevenue;
    if (revenueChange > 0.20) revenue_trend = 'Increasing';
    else if (revenueChange < -0.20) revenue_trend = 'Decreasing';
    else revenue_trend = 'Stable';
  }

  // Program trend direction
  let program_trend_direction = 'Stable';
  if (years_of_data >= 2) {
    const firstProgram = programSpends[0];
    const lastProgram = programSpends[years_of_data - 1];

    // Check if each year is lower than previous
    const alwaysDecreasing = programSpends.every((v, i) => i === 0 || v <= programSpends[i - 1]);
    const overallDrop = firstProgram > 0 ? (firstProgram - lastProgram) / firstProgram : 0;
    const overallGrowth = firstProgram > 0 ? (lastProgram - firstProgram) / firstProgram : 0;
    const variation = Math.max(...programSpends) - Math.min(...programSpends);
    const avgVal = avg_program_spend;

    if (alwaysDecreasing || overallDrop > 0.20) {
      program_trend_direction = 'Decreasing';
    } else if (variation < 10) {
      program_trend_direction = 'Stable';
    } else if (overallGrowth > 0.20) {
      program_trend_direction = 'Increasing';
    } else {
      program_trend_direction = 'Stable';
    }
  }

  // ─── STEP 3: RULE EVALUATION ─────────────────────────────────────────────
  const triggeredRules = [];

  // Rule 1: Sustained zero program activity
  if (zero_program_years >= 3) {
    triggeredRules.push('multi_year_zero_programs');
  }

  // Rule 2: Declining program activity
  if (program_trend_direction === 'Decreasing') {
    triggeredRules.push('declining_program_spend');
  }

  // Rule 3: Stable/increasing funding but low program activity
  if ((revenue_trend === 'Stable' || revenue_trend === 'Increasing') && avg_program_spend <= 10) {
    triggeredRules.push('funding_without_activity_growth');
  }

  // Rule 4: Consistently low program spend (needs >= 3 years)
  if (avg_program_spend <= 10 && years_of_data >= 3) {
    triggeredRules.push('persistently_low_program_activity');
  }

  // ─── STEP 4: PATTERN SCORE ───────────────────────────────────────────────
  const rawScore = triggeredRules.reduce((sum, id) => sum + (CREDIBILITY_RULES[id]?.weight || 0), 0);
  const pattern_score = Math.min(100, rawScore);

  // ─── STEP 5: CLASSIFICATION ──────────────────────────────────────────────
  let classification;
  if (pattern_score === 0) classification = 'No concerning pattern';
  else if (pattern_score <= 50) classification = 'Moderate pattern concern';
  else classification = 'Strong pattern signal';

  // ─── STEP 6: EXPLANATION ENGINE ──────────────────────────────────────────
  const explanations = triggeredRules.map(id => CREDIBILITY_RULES[id]?.description || '');
  let explanation_text;
  if (explanations.length === 0) {
    explanation_text = `No sustained concerning patterns were detected for ${organizationName || 'this organization'} across available years.`;
  } else {
    explanation_text = explanations.join(' ');
    if (explanations.length > 1) {
      explanation_text += ' This indicates a sustained pattern rather than a one-time anomaly.';
    }
  }

  return {
    organization_name: organizationName,
    years_of_data,
    pattern_score,
    classification,
    triggered_rules: triggeredRules.map(id => ({ id, ...CREDIBILITY_RULES[id] })),
    explanation_text,
    trend: {
      program_trend_direction,
      avg_program_spend: Math.round(avg_program_spend * 10) / 10,
      zero_program_years,
      revenue_trend,
      first_year: sorted[0]?.year || null,
      last_year: sorted[years_of_data - 1]?.year || null,
      yearly: sorted.map(r => ({
        year: r.year,
        program_spend_percentage: r.program_spend_percentage || 0,
        total_revenue: r.total_revenue || 0,
        government_funding_percentage: r.government_funding_percentage || 0,
      })),
    },
  };
}

// ─── MAP ENTITY DATA → ENGINE INPUT ──────────────────────────────────────────
/**
 * Groups FinancialIndicators records by year and maps to engine input format.
 */
export function buildCredibilityInput(financials = []) {
  return financials
    .filter(f => f.fiscalYear)
    .map(f => ({
      year: parseInt(f.fiscalYear) || 0,
      program_spend_percentage: f.totalExpenses > 0
        ? Math.round(((f.programExpense || 0) / f.totalExpenses) * 100)
        : 0,
      total_revenue: f.totalRevenue || 0,
      government_funding_percentage: f.totalRevenue > 0
        ? Math.round(((f.governmentRevenue || 0) / f.totalRevenue) * 100)
        : 0,
    }));
}

// ─── CLASSIFICATION STYLING ───────────────────────────────────────────────────
export function getPatternStyle(classification) {
  switch (classification) {
    case 'Strong pattern signal':
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800', bar: 'bg-red-500' };
    case 'Moderate pattern concern':
      return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-400' };
    case 'No concerning pattern':
      return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800', bar: 'bg-green-500' };
    default:
      return { bg: 'bg-muted/40', border: 'border-border', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground' };
  }
}