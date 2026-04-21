// Proof of Capacity Engine — Rules-based scoring model
// Scoring focuses on MISMATCH between funding claims and observable capacity.
// Small organizations are NOT penalized for being small — only for implausible gaps.

// Component weights — must sum to 1.0
export const SCORE_WEIGHTS = {
  staffingScore:            { weight: 0.20, label: 'Staffing Adequacy',       pct: '20%', tooltip: 'Evaluates whether staffing levels are plausible given the funding amount and delivery claims. Small orgs with small funding are not penalized. A flag is only raised when staff count is implausibly low relative to the money received and services promised.' },
  deliveryPlausibilityScore:{ weight: 0.25, label: 'Delivery Plausibility',   pct: '25%', tooltip: 'The highest-weight dimension. Compares the scale of claimed deliverables (participants served, sites managed, programs run) against observable capacity (staff, funding level). Implausible combinations — e.g. 3 staff promising 5,000 training completions — drive this score down sharply.' },
  programExpenseScore:      { weight: 0.25, label: 'Program Spending',         pct: '25%', tooltip: 'Measures what proportion of total expenses reaches program delivery vs. administration, compensation, or transfers to other entities. A low program ratio with high compensation or high pass-through transfers raises concern.' },
  revenueDiversityScore:    { weight: 0.15, label: 'Revenue Diversity',        pct: '15%', tooltip: 'Flags near-total dependence on a single government funder. Heavily concentrated revenue creates both sustainability and accountability risk. Organizations with genuinely diversified income score higher.' },
  infrastructureScore:      { weight: 0.10, label: 'Infrastructure & Status',  pct: '10%', tooltip: 'Checks whether the organization has a verifiable physical presence and is legally active. A dissolved or inactive organization, or one with no confirmed address, scores very low regardless of other factors.' },
  complianceScore:          { weight: 0.05, label: 'Compliance & Reporting',   pct: '5%',  tooltip: 'Reflects whether financial filings are current and timely. Missing or late filings reduce the ability to verify any other claims and are treated as a moderate-to-high flag.' },
};

export function calculateCapacityScores(org, funding, financials, benchmarks) {
  const factors = [];
  const totalFunding = funding.reduce((sum, f) => sum + (f.fundingAmount || 0), 0);
  const fin = financials[0] || {};

  const employees = org.employeeCount || 0;
  const volunteers = org.volunteerCount || 0;
  const totalStaff = employees + volunteers;

  // ─── 1. STAFFING ADEQUACY (20%) ──────────────────────────────────────────
  // Key principle: compare funding-per-staff ratio, NOT absolute headcount.
  // A 2-person org with $80K is fine. A 2-person org with $2M is not.
  let staffingScore = 75;

  if (totalFunding === 0) {
    staffingScore = 75; // no funding data — neutral
  } else if (employees === 0) {
    if (totalFunding > 500000) {
      staffingScore = 10;
      factors.push({ area: 'Staffing Adequacy', severity: 'high', detail: `Zero employees reported while receiving $${totalFunding.toLocaleString()} in public funding. No observable workforce to deliver this level of programming.` });
    } else if (totalFunding > 150000) {
      staffingScore = 35;
      factors.push({ area: 'Staffing Adequacy', severity: 'high', detail: `No employees reported with $${totalFunding.toLocaleString()} in funding. Even volunteer-only operations at this scale are unusual.` });
    } else {
      // Small funding + no employees = possibly legitimate volunteer org
      staffingScore = 60;
      factors.push({ area: 'Staffing Adequacy', severity: 'moderate', detail: `No employees reported, but funding is modest ($${totalFunding.toLocaleString()}). Review whether volunteers can reasonably cover delivery.` });
    }
  } else {
    const fundingPerEmployee = totalFunding / employees;
    // Context-sensitive thresholds: scale matters
    if (fundingPerEmployee > 600000) {
      staffingScore = 30;
      factors.push({ area: 'Staffing Adequacy', severity: 'high', detail: `$${Math.round(fundingPerEmployee).toLocaleString()} in funding per employee. This ratio is very high — delivery capacity is likely insufficient for the funding received.` });
    } else if (fundingPerEmployee > 300000) {
      staffingScore = 55;
      factors.push({ area: 'Staffing Adequacy', severity: 'moderate', detail: `$${Math.round(fundingPerEmployee).toLocaleString()} per employee. Staffing is relatively thin for this funding level.` });
    } else if (fundingPerEmployee > 150000) {
      staffingScore = 75;
      factors.push({ area: 'Staffing Adequacy', severity: 'low', detail: `$${Math.round(fundingPerEmployee).toLocaleString()} per employee. Staffing appears proportionate.` });
    } else {
      staffingScore = 90;
      factors.push({ area: 'Staffing Adequacy', severity: 'low', detail: `Strong staffing-to-funding ratio ($${Math.round(fundingPerEmployee).toLocaleString()}/employee). Capacity appears adequate.` });
    }
  }

  // ─── 2. DELIVERY PLAUSIBILITY (25%) ──────────────────────────────────────
  // Core question: is the claimed scope of work achievable with available capacity?
  let deliveryPlausibilityScore = 75;

  // Build a normalized "delivery demand" index
  const hasLargeDeliverables = funding.some(f =>
    f.expectedDeliverables && f.expectedDeliverables.length > 80
  );
  // Parse participant counts from deliverables text
  const allDeliverables = funding.map(f => f.expectedDeliverables || '').join(' ');
  const participantMatch = allDeliverables.match(/(\d[\d,]*)\s*(participant|youth|client|student|household|family|resident)/i);
  const claimedParticipants = participantMatch ? parseInt(participantMatch[1].replace(/,/g, '')) : 0;

  if (employees === 0 && totalFunding > 150000 && hasLargeDeliverables) {
    deliveryPlausibilityScore = 10;
    factors.push({ area: 'Delivery Plausibility', severity: 'high', detail: `Extensive delivery commitments with zero employees and $${totalFunding.toLocaleString()} in funding. There is no visible workforce to execute these deliverables.` });
  } else if (claimedParticipants > 0 && employees > 0) {
    const participantsPerEmployee = claimedParticipants / employees;
    if (participantsPerEmployee > 500) {
      deliveryPlausibilityScore = 20;
      factors.push({ area: 'Delivery Plausibility', severity: 'high', detail: `Claims to serve ~${claimedParticipants.toLocaleString()} participants with ${employees} employee(s) — roughly ${Math.round(participantsPerEmployee).toLocaleString()} per staff member. This ratio is implausible for direct service delivery.` });
    } else if (participantsPerEmployee > 150) {
      deliveryPlausibilityScore = 45;
      factors.push({ area: 'Delivery Plausibility', severity: 'moderate', detail: `${Math.round(participantsPerEmployee).toLocaleString()} participants per employee is high. Plausible only with strong infrastructure and evidence of past delivery.` });
    } else {
      deliveryPlausibilityScore = 80;
      factors.push({ area: 'Delivery Plausibility', severity: 'low', detail: `Participant-to-staff ratio (~${Math.round(participantsPerEmployee)}/employee) is within a plausible range.` });
    }
  } else if (totalFunding > 500000 && totalStaff < 5 && hasLargeDeliverables) {
    deliveryPlausibilityScore = 35;
    factors.push({ area: 'Delivery Plausibility', severity: 'high', detail: `Significant funding ($${totalFunding.toLocaleString()}) and broad delivery claims, but only ${totalStaff} total staff. Delivery capacity appears strained.` });
  } else if (totalFunding > 0 && totalFunding <= 200000) {
    // Small org — don't penalize if scale is proportionate
    deliveryPlausibilityScore = 80;
    factors.push({ area: 'Delivery Plausibility', severity: 'low', detail: `Funding scale ($${totalFunding.toLocaleString()}) and claimed scope appear proportionate for a small organization.` });
  } else {
    deliveryPlausibilityScore = 75;
    factors.push({ area: 'Delivery Plausibility', severity: 'low', detail: `No clear implausibility signals. Delivery scope appears consistent with observable capacity.` });
  }

  // ─── 3. PROGRAM SPENDING (25%) ───────────────────────────────────────────
  let programExpenseScore = 70;
  const programRatio = fin.totalExpenses > 0 ? (fin.programExpense || 0) / fin.totalExpenses : null;
  const compensationRatio = fin.totalExpenses > 0 ? (fin.compensationExpense || 0) / fin.totalExpenses : null;
  const transferRatio = fin.totalExpenses > 0 ? (fin.transferToOtherEntities || 0) / fin.totalExpenses : 0;

  if (programRatio === null) {
    programExpenseScore = 60;
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: 'No financial expense data available to evaluate spending patterns.' });
  } else if (programRatio < 0.20) {
    programExpenseScore = 15;
    factors.push({ area: 'Program Spending', severity: 'high', detail: `Only ${Math.round(programRatio * 100)}% of expenses reach program delivery. This is well below expected benchmarks and raises serious questions about fund utilization.` });
  } else if (programRatio < 0.35) {
    programExpenseScore = 38;
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: `${Math.round(programRatio * 100)}% program expense ratio is below the expected 40–55% minimum for direct service organizations.` });
  } else if (programRatio < 0.50) {
    programExpenseScore = 65;
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: `${Math.round(programRatio * 100)}% of spending goes to program delivery — acceptable but worth monitoring.` });
  } else {
    programExpenseScore = 88;
    factors.push({ area: 'Program Spending', severity: 'low', detail: `${Math.round(programRatio * 100)}% program expense ratio is strong. Most funding reaches intended delivery.` });
  }

  // Compensation flag — independent of program ratio
  if (compensationRatio !== null && compensationRatio > 0.70) {
    programExpenseScore = Math.min(programExpenseScore, 25);
    factors.push({ area: 'Program Spending', severity: 'high', detail: `${Math.round(compensationRatio * 100)}% of all expenses are compensation. When compensation dominates spending, minimal resources remain for actual program delivery.` });
  } else if (compensationRatio !== null && compensationRatio > 0.55) {
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: `${Math.round(compensationRatio * 100)}% compensation ratio is elevated. Consider whether staffing structure is appropriate for program type.` });
  }

  // Pass-through flag
  if (transferRatio > 0.30) {
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: `${Math.round(transferRatio * 100)}% of expenses transferred to other entities. A high pass-through rate reduces accountability for direct delivery and warrants tracing of recipient organizations.` });
  }

  // ─── 4. REVENUE DIVERSITY (15%) ──────────────────────────────────────────
  let revenueDiversityScore = 70;
  const govDependencyRatio = fin.totalRevenue > 0 ? (fin.governmentRevenue || 0) / fin.totalRevenue : null;

  if (govDependencyRatio === null) {
    revenueDiversityScore = 60;
    factors.push({ area: 'Revenue Diversity', severity: 'moderate', detail: 'No revenue data available to assess funding concentration.' });
  } else if (govDependencyRatio > 0.95) {
    revenueDiversityScore = 12;
    factors.push({ area: 'Revenue Diversity', severity: 'high', detail: `${Math.round(govDependencyRatio * 100)}% of revenue comes from government. Near-total dependency on a single public funder creates both sustainability risk and limited independent accountability.` });
  } else if (govDependencyRatio > 0.80) {
    revenueDiversityScore = 35;
    factors.push({ area: 'Revenue Diversity', severity: 'high', detail: `${Math.round(govDependencyRatio * 100)}% government dependency exceeds the 80% threshold. High concentration risk.` });
  } else if (govDependencyRatio > 0.60) {
    revenueDiversityScore = 60;
    factors.push({ area: 'Revenue Diversity', severity: 'moderate', detail: `${Math.round(govDependencyRatio * 100)}% government dependency is elevated but within a manageable range.` });
  } else {
    revenueDiversityScore = 90;
    factors.push({ area: 'Revenue Diversity', severity: 'low', detail: `Revenue is well-diversified — only ${Math.round(govDependencyRatio * 100)}% from government sources.` });
  }

  // ─── 5. INFRASTRUCTURE & STATUS (10%) ────────────────────────────────────
  let infrastructureScore = 70;
  const presence = org.physicalPresenceStatus;

  if (org.activeStatus === 'dissolved' || org.activeStatus === 'inactive') {
    infrastructureScore = 5;
    factors.push({ area: 'Infrastructure & Status', severity: 'high', detail: `Organization is listed as "${org.activeStatus}". A legally inactive or dissolved entity must not be receiving active public funding.` });
  } else if (presence === 'none') {
    infrastructureScore = 20;
    factors.push({ area: 'Infrastructure & Status', severity: 'high', detail: 'No physical presence identified. Organizations delivering publicly funded programs are expected to have a verifiable operational base.' });
  } else if (presence === 'unknown') {
    infrastructureScore = 45;
    factors.push({ area: 'Infrastructure & Status', severity: 'moderate', detail: 'Physical presence could not be verified. Further due diligence is recommended before renewal.' });
  } else if (presence === 'limited') {
    infrastructureScore = 65;
    factors.push({ area: 'Infrastructure & Status', severity: 'low', detail: 'Limited physical presence identified. Sufficient for small programs but may constrain scale.' });
  } else {
    infrastructureScore = 90;
    factors.push({ area: 'Infrastructure & Status', severity: 'low', detail: 'Physical presence confirmed. Operational base is verifiable.' });
  }

  // ─── 6. COMPLIANCE & REPORTING (5%) ──────────────────────────────────────
  let complianceScore = 85;

  if (fin.latestFilingStatus === 'missing') {
    complianceScore = 10;
    factors.push({ area: 'Compliance & Reporting', severity: 'high', detail: 'Financial filings are missing. Without current filings, all financial claims are unverifiable.' });
  } else if (fin.latestFilingStatus === 'late') {
    complianceScore = 50;
    factors.push({ area: 'Compliance & Reporting', severity: 'moderate', detail: 'Financial filings were submitted late. Timely reporting is a basic accountability requirement for publicly funded organizations.' });
  } else if (fin.latestFilingStatus === 'unknown') {
    complianceScore = 55;
    factors.push({ area: 'Compliance & Reporting', severity: 'moderate', detail: 'Filing status could not be confirmed. Recommend requesting current financial statements directly.' });
  } else {
    factors.push({ area: 'Compliance & Reporting', severity: 'low', detail: 'Financial filings are current. No reporting compliance issues identified.' });
  }

  // ─── OVERALL WEIGHTED SCORE ───────────────────────────────────────────────
  const overallCapacityScore = Math.round(
    staffingScore            * SCORE_WEIGHTS.staffingScore.weight +
    deliveryPlausibilityScore* SCORE_WEIGHTS.deliveryPlausibilityScore.weight +
    programExpenseScore      * SCORE_WEIGHTS.programExpenseScore.weight +
    revenueDiversityScore    * SCORE_WEIGHTS.revenueDiversityScore.weight +
    infrastructureScore      * SCORE_WEIGHTS.infrastructureScore.weight +
    complianceScore          * SCORE_WEIGHTS.complianceScore.weight
  );

  let riskLevel = 'low';
  if (overallCapacityScore < 40) riskLevel = 'high';
  else if (overallCapacityScore < 68) riskLevel = 'moderate';

  const humanReviewRequired = riskLevel !== 'low';

  // dependencyScore kept for backward compat (maps to revenueDiversityScore)
  return {
    staffingScore,
    infrastructureScore,
    revenueDiversityScore,
    programExpenseScore,
    dependencyScore: revenueDiversityScore,
    deliveryPlausibilityScore,
    complianceScore,
    overallCapacityScore,
    riskLevel,
    humanReviewRequired,
    factors,
  };
}

export function getRiskColor(level) {
  switch (level) {
    case 'low':      return { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  ring: 'ring-green-500/20',  badge: 'bg-green-100 text-green-800' };
    case 'moderate': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', ring: 'ring-yellow-500/20', badge: 'bg-yellow-100 text-yellow-800' };
    case 'high':     return { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    ring: 'ring-red-500/20',    badge: 'bg-red-100 text-red-800' };
    default:         return { bg: 'bg-muted',     text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground', ring: 'ring-muted', badge: 'bg-muted text-muted-foreground' };
  }
}

export function getScoreColor(score) {
  if (score >= 68) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function getScoreBgColor(score) {
  if (score >= 68) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}