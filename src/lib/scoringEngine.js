// Proof of Capacity Engine — Rules-based scoring model
// Layer 1: Capacity Score (existing)
// Layer 2: Capacity Readiness Score + Integrity Concern Score → Risk Nature Classification

// Component weights — must sum to 1.0
export const SCORE_WEIGHTS = {
  staffingScore:            { weight: 0.20, label: 'Staffing Adequacy',       pct: '20%', tooltip: 'Evaluates whether staffing levels are plausible given the funding amount and delivery claims. Small orgs with small funding are not penalized. A flag is only raised when staff count is implausibly low relative to the money received and services promised.' },
  deliveryPlausibilityScore:{ weight: 0.25, label: 'Delivery Plausibility',   pct: '25%', tooltip: 'The highest-weight dimension. Compares the scale of claimed deliverables (participants served, sites managed, programs run) against observable capacity (staff, funding level). Implausible combinations — e.g. 3 staff promising 5,000 training completions — drive this score down sharply.' },
  programExpenseScore:      { weight: 0.25, label: 'Program Spending',         pct: '25%', tooltip: 'Measures what proportion of total expenses reaches program delivery vs. administration, compensation, or transfers to other entities. A low program ratio with high compensation or high pass-through transfers raises concern.' },
  revenueDiversityScore:    { weight: 0.15, label: 'Revenue Diversity',        pct: '15%', tooltip: 'Flags near-total dependence on a single government funder. Heavily concentrated revenue creates both sustainability and accountability risk. Organizations with genuinely diversified income score higher.' },
  infrastructureScore:      { weight: 0.10, label: 'Infrastructure & Status',  pct: '10%', tooltip: 'Checks whether the organization has a verifiable physical presence and is legally active. A dissolved or inactive organization, or one with no confirmed address, scores very low regardless of other factors.' },
  complianceScore:          { weight: 0.05, label: 'Compliance & Reporting',   pct: '5%',  tooltip: 'Reflects whether financial filings are current and timely. Missing or late filings reduce the ability to verify any other claims and are treated as a moderate-to-high flag.' },
};

// ─── RISK NATURE CONFIG ───────────────────────────────────────────────────────
export const RISK_NATURE_CONFIG = {
  'Ready': {
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
    emoji: '✅',
    template: "This organization's staffing, infrastructure, and financial profile appear reasonably aligned with the proposed scope of work. Based on currently available evidence, the requested funding appears proportionate to observable capacity.",
    recommendedPath: 'Approve as requested',
  },
  'Emerging but Underdeveloped': {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
    emoji: '🌱',
    template: "This organization appears mission-aligned and shows some signs of genuine activity, but its current staffing, systems, or infrastructure do not yet support the scale of funding requested. A smaller or staged funding approach may be more appropriate.",
    recommendedPath: 'Refer to capacity-building stream',
  },
  'Overstretched / Request Exceeds Capacity': {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    dot: 'bg-orange-500',
    emoji: '⚠️',
    template: "This organization appears active and plausible, but the proposed scope, timeline, or funding level exceeds what its current operating model appears able to absorb. A revised scope or milestone-based funding approach should be considered.",
    recommendedPath: 'Approve with milestones',
  },
  'High Concern / Enhanced Due Diligence Required': {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
    emoji: '🚨',
    template: "This organization presents significant inconsistencies between claimed capacity and observable evidence. The current pattern does not support confident assessment through routine review alone and warrants enhanced due diligence before funding is considered.",
    recommendedPath: 'Escalate to enhanced review',
  },
};

/**
 * Apply a matched benchmark record as score modifiers on top of the base capacity scores.
 * Each benchmark threshold is compared to the org's actual data; if the org falls below
 * the benchmark expectation, a penalty is applied to the relevant sub-score.
 *
 * @param {object} scores  — the raw scores object (mutated in place)
 * @param {object} org
 * @param {object} financials — first financial record
 * @param {object} benchmark — matched Benchmark entity record
 * @param {Array}  factors   — mutable factors array to append benchmark notes to
 */
function applyBenchmarkModifiers(scores, org, fin, benchmark, factors) {
  const modifiers = [];

  // 1. Min employees benchmark
  const minEmp = benchmark.minimumExpectedEmployees;
  if (minEmp && minEmp > 0) {
    const actual = org.employeeCount || 0;
    if (actual < minEmp) {
      const gap = minEmp - actual;
      const penalty = Math.min(20, gap * 4); // up to 20pt penalty
      scores.staffingScore = Math.max(0, scores.staffingScore - penalty);
      modifiers.push({
        area: 'Staffing Adequacy',
        severity: actual === 0 ? 'high' : 'moderate',
        detail: `Benchmark for this category requires at least ${minEmp} employee${minEmp !== 1 ? 's' : ''}. This organization reports ${actual}. Score adjusted by −${penalty} points.`,
      });
    }
  }

  // 2. Min infrastructure level benchmark
  const infraOrder = { none: 0, light: 1, moderate: 2, significant: 3 };
  const minInfra = benchmark.minimumInfrastructureLevel;
  if (minInfra) {
    const actualInfra = org.physicalPresenceStatus === 'confirmed' ? 'significant'
      : org.physicalPresenceStatus === 'limited' ? 'light'
      : org.physicalPresenceStatus === 'none' ? 'none'
      : 'light';
    const actualLevel = infraOrder[actualInfra] ?? 1;
    const requiredLevel = infraOrder[minInfra] ?? 0;
    if (actualLevel < requiredLevel) {
      const penalty = (requiredLevel - actualLevel) * 10;
      scores.infrastructureScore = Math.max(0, scores.infrastructureScore - penalty);
      modifiers.push({
        area: 'Infrastructure & Status',
        severity: 'moderate',
        detail: `Benchmark for this category requires "${minInfra}" infrastructure or better. This organization's presence is "${actualInfra}". Score adjusted by −${penalty} points.`,
      });
    }
  }

  // 3. Expected program expense ratio benchmark
  const expectedPER = benchmark.expectedProgramExpenseRatio;
  if (expectedPER && expectedPER > 0 && fin.totalExpenses > 0) {
    const actualPER = (fin.programExpense || 0) / fin.totalExpenses;
    if (actualPER < expectedPER) {
      const gap = expectedPER - actualPER; // 0–1
      const penalty = Math.round(Math.min(25, gap * 60)); // up to 25pt penalty
      scores.programExpenseScore = Math.max(0, scores.programExpenseScore - penalty);
      modifiers.push({
        area: 'Program Spending',
        severity: actualPER < expectedPER * 0.6 ? 'high' : 'moderate',
        detail: `Benchmark for this category expects a program expense ratio of ${Math.round(expectedPER * 100)}%. This organization's ratio is ${Math.round(actualPER * 100)}%. Score adjusted by −${penalty} points.`,
      });
    }
  }

  // 4. Max government dependency benchmark
  const maxGovDep = benchmark.maxGovernmentDependencyRatio;
  if (maxGovDep && maxGovDep > 0 && fin.totalRevenue > 0) {
    const actualGovDep = (fin.governmentRevenue || 0) / fin.totalRevenue;
    if (actualGovDep > maxGovDep) {
      const gap = actualGovDep - maxGovDep; // 0–1
      const penalty = Math.round(Math.min(20, gap * 50)); // up to 20pt penalty
      scores.revenueDiversityScore = Math.max(0, scores.revenueDiversityScore - penalty);
      modifiers.push({
        area: 'Revenue Diversity',
        severity: actualGovDep > maxGovDep + 0.15 ? 'high' : 'moderate',
        detail: `Benchmark for this category caps government dependency at ${Math.round(maxGovDep * 100)}%. This organization is at ${Math.round(actualGovDep * 100)}%. Score adjusted by −${penalty} points.`,
      });
    }
  }

  // Append modifier factors (tagged as benchmark findings)
  modifiers.forEach(m => factors.push({ ...m, isBenchmarkModifier: true }));

  return modifiers.length > 0;
}

export function calculateCapacityScores(org, funding, financials, benchmarks, benchmark = null, opts = {}) {
  const factors = [];
  // Prefer an authoritative server-side total (across all paged funding rows)
  // over funding.reduce(), which only sees the loaded page. The fallback keeps
  // back-compat for callers that don't pass an override.
  const totalFunding = (typeof opts.totalFundingOverride === 'number' && opts.totalFundingOverride > 0)
    ? opts.totalFundingOverride
    : funding.reduce((sum, f) => sum + (f.fundingAmount || 0), 0);
  const fin = financials[0] || {};

  // CRITICAL: distinguish null (data unknown — entity has no T3010 filing)
  // from a real reported 0. Coercing to 0 with `|| 0` produces false-positive
  // "Zero employees reported" messages on for-profit corps and AB-only orgs
  // that are not required to file the T3010 form where field_370 lives.
  const employeesKnown  = typeof org.employeeCount  === 'number';
  const volunteersKnown = typeof org.volunteerCount === 'number';
  const employees  = employeesKnown  ? org.employeeCount  : 0;  // for math; but `employeesKnown` gates the verdict
  const volunteers = volunteersKnown ? org.volunteerCount : 0;
  const totalStaff = employees + volunteers;

  // ─── 1. STAFFING ADEQUACY (20%) ──────────────────────────────────────────
  let staffingScore = 75;

  if (!employeesKnown) {
    // Headcount is genuinely unknown — for-profit company, AB-only entity with
    // no T3010 filing, etc. Score neutral and surface the gap, do NOT assert "zero".
    staffingScore = 60;
    factors.push({
      area: 'Staffing Adequacy',
      severity: 'moderate',
      detail:
        'Headcount unknown — this entity has no CRA T3010 filing in the dataset (for-profit ' +
        'corporations and AB-only non-profits often fall here). The 0/10 ghost-score ' +
        'staffing flags do NOT apply because we have no source to assert "zero employees" against. ' +
        'Reviewer should request employer-payroll evidence directly before a determination.',
    });
  } else if (totalFunding === 0) {
    staffingScore = 75;
  } else if (employees === 0) {
    if (totalFunding > 500000) {
      staffingScore = 10;
      factors.push({ area: 'Staffing Adequacy', severity: 'high', detail: `Zero employees reported on T3010 while receiving $${totalFunding.toLocaleString()} in public funding. No observable workforce to deliver this level of programming.` });
    } else if (totalFunding > 150000) {
      staffingScore = 35;
      factors.push({ area: 'Staffing Adequacy', severity: 'high', detail: `No employees on T3010 with $${totalFunding.toLocaleString()} in funding. Even volunteer-only operations at this scale are unusual.` });
    } else {
      staffingScore = 60;
      factors.push({ area: 'Staffing Adequacy', severity: 'moderate', detail: `No employees on T3010, but funding is modest ($${totalFunding.toLocaleString()}). Review whether volunteers can reasonably cover delivery.` });
    }
  } else {
    const fundingPerEmployee = totalFunding / employees;
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
  let deliveryPlausibilityScore = 75;
  const hasLargeDeliverables = funding.some(f => f.expectedDeliverables && f.expectedDeliverables.length > 80);
  const allDeliverables = funding.map(f => f.expectedDeliverables || '').join(' ');
  const participantMatch = allDeliverables.match(/(\d[\d,]*)\s*(participant|youth|client|student|household|family|resident)/i);
  const claimedParticipants = participantMatch ? parseInt(participantMatch[1].replace(/,/g, '')) : 0;

  if (!employeesKnown) {
    deliveryPlausibilityScore = 60;
    factors.push({
      area: 'Delivery Plausibility',
      severity: 'moderate',
      detail: 'Cannot assess delivery plausibility — workforce data not in the warehouse for this entity (no T3010 filing). Request operational evidence before determination.',
    });
  } else if (employees === 0 && totalFunding > 150000 && hasLargeDeliverables) {
    deliveryPlausibilityScore = 10;
    factors.push({ area: 'Delivery Plausibility', severity: 'high', detail: `Extensive delivery commitments with zero employees on T3010 and $${totalFunding.toLocaleString()} in funding. There is no visible workforce to execute these deliverables.` });
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

  if (compensationRatio !== null && compensationRatio > 0.70) {
    programExpenseScore = Math.min(programExpenseScore, 25);
    factors.push({ area: 'Program Spending', severity: 'high', detail: `${Math.round(compensationRatio * 100)}% of all expenses are compensation. When compensation dominates spending, minimal resources remain for actual program delivery.` });
  } else if (compensationRatio !== null && compensationRatio > 0.55) {
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: `${Math.round(compensationRatio * 100)}% compensation ratio is elevated. Consider whether staffing structure is appropriate for program type.` });
  }

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

  // ─── BENCHMARK MODIFIERS (applied before final roll-up) ──────────────────
  const scoreObj = { staffingScore, infrastructureScore, programExpenseScore, revenueDiversityScore, deliveryPlausibilityScore, complianceScore };
  let benchmarkApplied = false;
  if (benchmark) {
    benchmarkApplied = applyBenchmarkModifiers(scoreObj, org, fin, benchmark, factors);
    // Pull back into locals after modification
    staffingScore             = scoreObj.staffingScore;
    infrastructureScore       = scoreObj.infrastructureScore;
    programExpenseScore       = scoreObj.programExpenseScore;
    revenueDiversityScore     = scoreObj.revenueDiversityScore;
    deliveryPlausibilityScore = scoreObj.deliveryPlausibilityScore;
    complianceScore           = scoreObj.complianceScore;
  }

  // ─── OVERALL WEIGHTED SCORE (Layer 1) ─────────────────────────────────────
  const overallCapacityScore = Math.round(
    staffingScore             * SCORE_WEIGHTS.staffingScore.weight +
    deliveryPlausibilityScore * SCORE_WEIGHTS.deliveryPlausibilityScore.weight +
    programExpenseScore       * SCORE_WEIGHTS.programExpenseScore.weight +
    revenueDiversityScore     * SCORE_WEIGHTS.revenueDiversityScore.weight +
    infrastructureScore       * SCORE_WEIGHTS.infrastructureScore.weight +
    complianceScore           * SCORE_WEIGHTS.complianceScore.weight
  );

  let riskLevel = 'low';
  if (overallCapacityScore < 40) riskLevel = 'high';
  else if (overallCapacityScore < 68) riskLevel = 'moderate';

  const humanReviewRequired = riskLevel !== 'low';

  // ─── LAYER 2A: CAPACITY READINESS SCORE (0-100) ───────────────────────────
  // Measures: can they actually deliver what they propose?
  // Staffing 25%, Infrastructure 20%, Financial Operating 20%, Delivery 25%, Governance 10%

  // Staffing dimension (25%)
  const crStaffing = Math.min(100, staffingScore);

  // Infrastructure dimension (20%)
  const crInfrastructure = Math.min(100, infrastructureScore);

  // Financial operating capacity (20%) — proxy via program spending + revenue diversity
  const crFinancial = Math.round((programExpenseScore * 0.6) + (revenueDiversityScore * 0.4));

  // Delivery plausibility (25%)
  const crDelivery = Math.min(100, deliveryPlausibilityScore);

  // Governance/maturity (10%) — proxy via compliance
  const crGovernance = Math.min(100, complianceScore);

  const capacityReadinessScore = Math.round(
    crStaffing      * 0.25 +
    crInfrastructure* 0.20 +
    crFinancial     * 0.20 +
    crDelivery      * 0.25 +
    crGovernance    * 0.10
  );

  // ─── LAYER 2B: INTEGRITY CONCERN SCORE (0-100) ────────────────────────────
  // Measures: do the gaps look developmental or strategically patterned?
  // Verifiability 25%, Internal Consistency 25%, Extraction Risk 20%, Network/Gov 15%, Dormancy 15%

  // Verifiability gap (25%) — no footprint, unknown presence, no website
  let verifiabilityGap = 0;
  if (presence === 'none') verifiabilityGap += 60;
  else if (presence === 'unknown') verifiabilityGap += 35;
  else if (presence === 'limited') verifiabilityGap += 15;
  if (!org.website) verifiabilityGap += 20;
  if (fin.latestFilingStatus === 'missing') verifiabilityGap += 20;
  verifiabilityGap = Math.min(100, verifiabilityGap);

  // Internal consistency gap (25%) — contradictions between claims and evidence
  let consistencyGap = 0;
  if (employees === 0 && totalFunding > 300000) consistencyGap += 50;
  else if (employees === 0 && totalFunding > 100000) consistencyGap += 30;
  if (claimedParticipants > 0 && employees > 0 && (claimedParticipants / employees) > 500) consistencyGap += 40;
  else if (claimedParticipants > 0 && employees > 0 && (claimedParticipants / employees) > 200) consistencyGap += 20;
  if (hasLargeDeliverables && totalStaff < 3) consistencyGap += 25;
  consistencyGap = Math.min(100, consistencyGap);

  // Structural extraction risk (20%) — compensation dominance, pass-through, low program spend
  let extractionRisk = 0;
  if (programRatio !== null && programRatio < 0.20) extractionRisk += 50;
  else if (programRatio !== null && programRatio < 0.35) extractionRisk += 25;
  if (compensationRatio !== null && compensationRatio > 0.70) extractionRisk += 35;
  else if (compensationRatio !== null && compensationRatio > 0.55) extractionRisk += 15;
  if (transferRatio > 0.40) extractionRisk += 30;
  else if (transferRatio > 0.25) extractionRisk += 15;
  extractionRisk = Math.min(100, extractionRisk);

  // Network / governance concern (15%) — proxy via status anomalies and gov dependency
  let networkConcern = 0;
  if (govDependencyRatio !== null && govDependencyRatio > 0.95) networkConcern += 40;
  else if (govDependencyRatio !== null && govDependencyRatio > 0.80) networkConcern += 20;
  if (fin.latestFilingStatus === 'missing') networkConcern += 30;
  else if (fin.latestFilingStatus === 'late') networkConcern += 10;
  networkConcern = Math.min(100, networkConcern);

  // Disappearance / dormancy risk (15%) — inactive status, missing filings
  let dormancyRisk = 0;
  if (org.activeStatus === 'dissolved' || org.activeStatus === 'inactive') dormancyRisk += 70;
  if (fin.latestFilingStatus === 'missing') dormancyRisk += 30;
  else if (fin.latestFilingStatus === 'late') dormancyRisk += 15;
  if (presence === 'none') dormancyRisk += 20;
  dormancyRisk = Math.min(100, dormancyRisk);

  const integrityConcernScore = Math.round(
    verifiabilityGap * 0.25 +
    consistencyGap   * 0.25 +
    extractionRisk   * 0.20 +
    networkConcern   * 0.15 +
    dormancyRisk     * 0.15
  );

  // ─── LAYER 2C: RISK NATURE CLASSIFICATION ────────────────────────────────
  let riskNature;

  if (capacityReadinessScore >= 75 && integrityConcernScore < 25) {
    riskNature = 'Ready';
  } else if (integrityConcernScore >= 50 || (capacityReadinessScore < 35 && integrityConcernScore >= 40)) {
    riskNature = 'High Concern / Enhanced Due Diligence Required';
  } else if (
    capacityReadinessScore >= 40 && capacityReadinessScore <= 65 &&
    integrityConcernScore >= 20 && integrityConcernScore <= 45
  ) {
    riskNature = 'Overstretched / Request Exceeds Capacity';
  } else if (capacityReadinessScore < 65 && integrityConcernScore < 35) {
    riskNature = 'Emerging but Underdeveloped';
  } else {
    // Fallback: use overall score
    riskNature = overallCapacityScore >= 68 ? 'Ready' :
                 overallCapacityScore >= 40 ? 'Overstretched / Request Exceeds Capacity' :
                 'High Concern / Enhanced Due Diligence Required';
  }

  const recommendedFundingPath = RISK_NATURE_CONFIG[riskNature]?.recommendedPath || 'Request more evidence';

  // ─── "WHY THIS CASE LANDED HERE" ─────────────────────────────────────────
  const positiveFactors = factors.filter(f => f.severity === 'low');
  const highFactors = factors.filter(f => f.severity === 'high');
  const modFactors = factors.filter(f => f.severity === 'moderate');

  const positiveSignal = positiveFactors.length > 0
    ? positiveFactors[0].detail
    : employees > 0
    ? `${employees} employee${employees > 1 ? 's' : ''} reported with active organizational status.`
    : 'Organization has active registration status.';

  const cautionSignal = highFactors.length > 0
    ? highFactors[0].detail
    : modFactors.length > 0
    ? modFactors[0].detail
    : 'No major red flags detected, but data coverage is limited.';

  const classificationReasonMap = {
    'Ready': `Capacity readiness score (${capacityReadinessScore}/100) is strong and integrity concern score (${integrityConcernScore}/100) is low. Observable indicators are aligned with funding level.`,
    'Emerging but Underdeveloped': `Capacity readiness score (${capacityReadinessScore}/100) indicates operational immaturity relative to the funding request. Integrity concern score (${integrityConcernScore}/100) does not suggest strategic manipulation — the gap appears developmental.`,
    'Overstretched / Request Exceeds Capacity': `The organization shows real operational activity, but capacity readiness (${capacityReadinessScore}/100) and integrity concern (${integrityConcernScore}/100) together suggest the funding request or delivery scope materially exceeds current operational capacity.`,
    'High Concern / Enhanced Due Diligence Required': `Integrity concern score (${integrityConcernScore}/100) is elevated${integrityConcernScore >= 50 ? ' above the 50-point threshold' : ''}. The combination of weak capacity readiness (${capacityReadinessScore}/100) and patterned inconsistencies justifies enhanced scrutiny before any funding determination.`,
  };

  const whyThisCase = {
    positiveSignal,
    cautionSignal,
    classificationReason: classificationReasonMap[riskNature] || '',
  };

  return {
    staffingScore,
    infrastructureScore,
    revenueDiversityScore,
    programExpenseScore,
    dependencyScore: revenueDiversityScore,
    deliveryPlausibilityScore,
    complianceScore,
    overallCapacityScore,
    capacityReadinessScore,
    integrityConcernScore,
    riskLevel,
    riskNature,
    recommendedFundingPath,
    humanReviewRequired,
    factors,
    whyThisCase,
    benchmarkApplied,
    benchmarkCategory: benchmark?.benchmarkCategory || null,
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