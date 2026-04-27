/**
 * Mismatch Engine — Proof of Capacity
 *
 * Detects internal contradictions within submitted organizational data.
 * These are not fraud determinations — they are signals of inconsistency
 * that warrant closer human review.
 */

// ─── RULE DEFINITIONS ─────────────────────────────────────────────────────────
export const MISMATCH_RULES = {
  compensation_without_staff: {
    id: 'compensation_without_staff',
    label: 'Compensation Without Staff',
    description: 'Financial activity suggests operations, but no staff are reported.',
    detail: 'Total compensation exceeds $10,000 yet no full-time or part-time staff are on record. Compensation payments with zero reported headcount is an internal contradiction.',
    weight: 25,
  },
  funding_without_programs: {
    id: 'funding_without_programs',
    label: 'Funding Without Program Activity',
    description: 'Organization receives significant government funding but reports little or no program spending.',
    detail: 'Program spend is at or below 5% of total expenses while government funding represents 70% or more of total revenue. A heavily government-funded organization with negligible program activity is inconsistent with stated purpose.',
    weight: 25,
  },
  weak_governance_high_funding: {
    id: 'weak_governance_high_funding',
    label: 'Small Governance with Large Funding',
    description: 'High funding levels are supported by a very small governance structure.',
    detail: 'Total revenue exceeds $500,000 but only 2 or fewer directors are listed. Governance capacity appears disproportionately small relative to the financial accountability obligations of this funding level.',
    weight: 25,
  },
  claims_without_footprint: {
    id: 'claims_without_footprint',
    label: 'Program Claims Without Operational Footprint',
    description: 'Program claims are present, but no external operational footprint (such as a website) is visible.',
    detail: 'A program description is recorded, but no website is listed. Organizations delivering publicly funded programs are expected to maintain some externally verifiable presence.',
    weight: 25,
  },
};

// ─── CORE ENGINE ──────────────────────────────────────────────────────────────
/**
 * @param {object} input
 * @param {string} input.organization_name
 * @param {number} input.full_time_staff
 * @param {number} input.part_time_staff
 * @param {number} input.total_compensation
 * @param {number} input.program_spend_percentage   (0–100)
 * @param {number} input.total_revenue
 * @param {number} input.government_funding_percentage (0–100)
 * @param {number} input.number_of_directors
 * @param {boolean} input.program_description_present
 * @param {boolean} input.website_present
 */
export function runMismatchEngine(input) {
  const {
    organization_name = '',
    full_time_staff = 0,
    part_time_staff = 0,
    total_compensation = 0,
    program_spend_percentage = 0,
    total_revenue = 0,
    government_funding_percentage = 0,
    number_of_directors = 0,
    program_description_present = false,
    website_present = false,
  } = input;

  // ─── STEP 1: DERIVED FIELDS ───────────────────────────────────────────────
  const total_staff = (full_time_staff || 0) + (part_time_staff || 0);

  // ─── STEP 2: RULE EVALUATION ──────────────────────────────────────────────
  const triggeredRules = [];

  // Rule 1: Compensation without staff
  if (total_compensation > 10000 && total_staff === 0) {
    triggeredRules.push('compensation_without_staff');
  }

  // Rule 2: Funding without program activity
  if (program_spend_percentage <= 5 && government_funding_percentage >= 70) {
    triggeredRules.push('funding_without_programs');
  }

  // Rule 3: Small governance with large funding
  if (number_of_directors <= 2 && total_revenue > 500000) {
    triggeredRules.push('weak_governance_high_funding');
  }

  // Rule 4: Program claims without footprint
  if (program_description_present === true && website_present === false) {
    triggeredRules.push('claims_without_footprint');
  }

  // ─── STEP 3: MISMATCH SCORE ───────────────────────────────────────────────
  const rawScore = triggeredRules.reduce((sum, ruleId) => sum + (MISMATCH_RULES[ruleId]?.weight || 0), 0);
  const mismatch_score = Math.min(100, rawScore);

  // ─── STEP 4: CLASSIFICATION ───────────────────────────────────────────────
  let classification;
  if (mismatch_score === 0) {
    classification = 'No mismatch detected';
  } else if (mismatch_score <= 50) {
    classification = 'Moderate mismatch';
  } else {
    classification = 'High mismatch';
  }

  // ─── STEP 5: EXPLANATION ENGINE ───────────────────────────────────────────
  const explanations = triggeredRules.map(ruleId => MISMATCH_RULES[ruleId]?.description || '');

  let explanation_text = '';
  if (explanations.length === 0) {
    explanation_text = `No internal contradictions were detected for ${organization_name || 'this organization'} based on the submitted data fields.`;
  } else {
    explanation_text = explanations.join(' ');
    if (explanations.length > 1) {
      explanation_text += ' These signals indicate potential inconsistencies between reported capacity and operational activity.';
    }
  }

  return {
    organization_name,
    total_staff,
    mismatch_score,
    classification,
    triggered_rules: triggeredRules.map(id => ({
      id,
      ...MISMATCH_RULES[id],
    })),
    explanation_text,
  };
}

// ─── MAP ENTITY DATA → ENGINE INPUT ──────────────────────────────────────────
/**
 * Converts raw Organization + FinancialIndicators + FundingRecords entities
 * into the mismatch engine input format.
 */
export function buildMismatchInput(org, financials = [], funding = []) {
  const fin = financials[0] || {};
  const totalFundingAmount = funding.reduce((s, f) => s + (f.fundingAmount || 0), 0);

  const total_revenue = fin.totalRevenue || totalFundingAmount || 0;
  const total_expenses = fin.totalExpenses || 0;
  const program_expense = fin.programExpense || 0;
  const program_spend_percentage = total_expenses > 0
    ? Math.round((program_expense / total_expenses) * 100)
    : 0;

  const government_funding_percentage = total_revenue > 0
    ? Math.round(((fin.governmentRevenue || 0) / total_revenue) * 100)
    : 0;

  const total_compensation = fin.compensationExpense || 0;

  // Derive program_description_present: org has missionDescription or any funding record has expectedDeliverables
  const program_description_present =
    !!(org.missionDescription && org.missionDescription.trim().length > 10) ||
    funding.some(f => f.expectedDeliverables && f.expectedDeliverables.trim().length > 10);

  const website_present = !!(org.website && org.website.trim().length > 3);

  return {
    organization_name: org.organizationName || '',
    full_time_staff: org.employeeCount || 0,
    part_time_staff: org.volunteerCount || 0,
    total_compensation,
    program_spend_percentage,
    total_revenue,
    government_funding_percentage,
    number_of_directors: org.numberOfDirectors || 0,
    program_description_present,
    website_present,
  };
}

// ─── CLASSIFICATION STYLING ───────────────────────────────────────────────────
export function getMismatchStyle(classification) {
  switch (classification) {
    case 'High mismatch':
      return {
        bg: 'bg-red-50', border: 'border-red-200',
        text: 'text-red-700', badge: 'bg-red-100 text-red-800',
        bar: 'bg-red-500', dot: 'bg-red-500',
      };
    case 'Moderate mismatch':
      return {
        bg: 'bg-yellow-50', border: 'border-yellow-200',
        text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800',
        bar: 'bg-yellow-400', dot: 'bg-yellow-400',
      };
    default:
      return {
        bg: 'bg-green-50', border: 'border-green-200',
        text: 'text-green-700', badge: 'bg-green-100 text-green-800',
        bar: 'bg-green-500', dot: 'bg-green-500',
      };
  }
}