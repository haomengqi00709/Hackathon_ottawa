// Proof of Capacity Engine — Rules-based scoring model
// All logic is transparent and explainable

export function calculateCapacityScores(org, funding, financials, benchmarks) {
  const factors = [];
  const totalFunding = funding.reduce((sum, f) => sum + (f.fundingAmount || 0), 0);
  const fin = financials[0] || {};

  // --- Staffing Score ---
  let staffingScore = 70;
  const employees = org.employeeCount || 0;
  const volunteers = org.volunteerCount || 0;
  const totalStaff = employees + volunteers;

  if (employees === 0 && totalFunding > 500000) {
    staffingScore = 15;
    factors.push({ area: 'Staffing', severity: 'high', detail: `Zero employees reported with $${totalFunding.toLocaleString()} in funding. This level of funding typically requires dedicated staff.` });
  } else if (employees === 0 && totalFunding > 100000) {
    staffingScore = 30;
    factors.push({ area: 'Staffing', severity: 'high', detail: `No employees reported with significant funding of $${totalFunding.toLocaleString()}.` });
  } else if (employees > 0 && totalFunding > 0) {
    const fundingPerEmployee = totalFunding / employees;
    if (fundingPerEmployee > 500000) {
      staffingScore = 35;
      factors.push({ area: 'Staffing', severity: 'moderate', detail: `High funding-per-employee ratio ($${Math.round(fundingPerEmployee).toLocaleString()}/employee). Staffing appears thin relative to funding volume.` });
    } else if (fundingPerEmployee > 200000) {
      staffingScore = 55;
      factors.push({ area: 'Staffing', severity: 'moderate', detail: `Elevated funding-per-employee ratio ($${Math.round(fundingPerEmployee).toLocaleString()}/employee).` });
    } else {
      staffingScore = 80;
      factors.push({ area: 'Staffing', severity: 'low', detail: `Staffing levels appear proportionate to funding received.` });
    }
  } else if (totalFunding <= 100000 && totalStaff >= 0) {
    // Small but plausible — don't penalize small orgs with small funding
    staffingScore = 75;
    factors.push({ area: 'Staffing', severity: 'low', detail: `Funding level is modest ($${totalFunding.toLocaleString()}). Staffing scale appears reasonable for this level.` });
  }

  // --- Infrastructure Score ---
  let infrastructureScore = 70;
  const presence = org.physicalPresenceStatus;
  if (presence === 'none') {
    infrastructureScore = 25;
    factors.push({ area: 'Infrastructure', severity: 'high', detail: 'No physical presence identified. Organizations receiving public funds typically require some observable infrastructure.' });
  } else if (presence === 'unknown') {
    infrastructureScore = 40;
    factors.push({ area: 'Infrastructure', severity: 'moderate', detail: 'Physical presence status is unknown. Unable to verify operational infrastructure.' });
  } else if (presence === 'limited') {
    infrastructureScore = 60;
    factors.push({ area: 'Infrastructure', severity: 'low', detail: 'Limited physical presence identified.' });
  } else {
    infrastructureScore = 85;
    factors.push({ area: 'Infrastructure', severity: 'low', detail: 'Physical presence confirmed.' });
  }

  if (org.activeStatus === 'dissolved' || org.activeStatus === 'inactive') {
    infrastructureScore = Math.min(infrastructureScore, 15);
    factors.push({ area: 'Infrastructure', severity: 'high', detail: `Organization status is "${org.activeStatus}". An inactive or dissolved entity should not be receiving active funding.` });
  }

  // --- Revenue Diversity Score ---
  let revenueDiversityScore = 70;
  const govDependencyRatio = fin.totalRevenue > 0 ? (fin.governmentRevenue || 0) / fin.totalRevenue : 0;

  if (govDependencyRatio > 0.95) {
    revenueDiversityScore = 15;
    factors.push({ area: 'Revenue Diversity', severity: 'high', detail: `${Math.round(govDependencyRatio * 100)}% of revenue is from government sources. Near-total dependency on public funding creates significant sustainability and accountability risk.` });
  } else if (govDependencyRatio > 0.80) {
    revenueDiversityScore = 35;
    factors.push({ area: 'Revenue Diversity', severity: 'high', detail: `${Math.round(govDependencyRatio * 100)}% government dependency exceeds the 80% threshold. High concentration risk.` });
  } else if (govDependencyRatio > 0.60) {
    revenueDiversityScore = 55;
    factors.push({ area: 'Revenue Diversity', severity: 'moderate', detail: `${Math.round(govDependencyRatio * 100)}% government dependency is elevated but within manageable range.` });
  } else {
    revenueDiversityScore = 85;
    factors.push({ area: 'Revenue Diversity', severity: 'low', detail: `Revenue appears diversified with ${Math.round(govDependencyRatio * 100)}% government dependency.` });
  }

  // --- Program Expense Score ---
  let programExpenseScore = 70;
  const programRatio = fin.totalExpenses > 0 ? (fin.programExpense || 0) / fin.totalExpenses : 0;
  const compensationRatio = fin.totalExpenses > 0 ? (fin.compensationExpense || 0) / fin.totalExpenses : 0;
  const transferRatio = fin.totalExpenses > 0 ? (fin.transferToOtherEntities || 0) / fin.totalExpenses : 0;

  if (programRatio < 0.20 && fin.totalExpenses > 0) {
    programExpenseScore = 20;
    factors.push({ area: 'Program Spending', severity: 'high', detail: `Only ${Math.round(programRatio * 100)}% of expenses go to program delivery. Very low proportion raises questions about how funds are being used.` });
  } else if (programRatio < 0.40 && fin.totalExpenses > 0) {
    programExpenseScore = 40;
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: `${Math.round(programRatio * 100)}% program expense ratio is below typical benchmarks.` });
  } else if (fin.totalExpenses > 0) {
    programExpenseScore = 80;
    factors.push({ area: 'Program Spending', severity: 'low', detail: `${Math.round(programRatio * 100)}% of spending goes to program delivery.` });
  }

  if (compensationRatio > 0.70 && fin.totalExpenses > 0) {
    programExpenseScore = Math.min(programExpenseScore, 30);
    factors.push({ area: 'Program Spending', severity: 'high', detail: `${Math.round(compensationRatio * 100)}% of total expenses go to compensation. Extremely high share may indicate the organization primarily funds salaries rather than delivering programs.` });
  }

  if (transferRatio > 0.50 && fin.totalExpenses > 0) {
    factors.push({ area: 'Program Spending', severity: 'moderate', detail: `${Math.round(transferRatio * 100)}% of expenses transferred to other entities. Possible pass-through structure.` });
  }

  // --- Dependency Score ---
  let dependencyScore = 100 - Math.round(govDependencyRatio * 100);
  if (govDependencyRatio > 0.80) {
    factors.push({ area: 'Dependency', severity: 'high', detail: `Government dependency ratio of ${Math.round(govDependencyRatio * 100)}% exceeds acceptable threshold.` });
  }

  // --- Delivery Plausibility Score ---
  let deliveryPlausibilityScore = 70;
  const hasLargeDeliverables = funding.some(f => f.expectedDeliverables && f.expectedDeliverables.length > 100);

  if (hasLargeDeliverables && employees < 3 && totalFunding > 200000) {
    deliveryPlausibilityScore = 25;
    factors.push({ area: 'Delivery Plausibility', severity: 'high', detail: `Significant deliverables claimed with fewer than 3 employees and $${totalFunding.toLocaleString()} in funding. The claimed delivery scope appears unrealistic relative to observable capacity.` });
  } else if (totalFunding > 500000 && totalStaff < 5) {
    deliveryPlausibilityScore = 35;
    factors.push({ area: 'Delivery Plausibility', severity: 'high', detail: `Very low staff count relative to funding suggests limited actual delivery capability.` });
  } else if (totalFunding > 0 && totalFunding <= 100000 && totalStaff <= 5) {
    deliveryPlausibilityScore = 75;
    factors.push({ area: 'Delivery Plausibility', severity: 'low', detail: `Funding and staffing scale appear proportionate. Small organizations can deliver effectively at this scale.` });
  } else {
    deliveryPlausibilityScore = 75;
    factors.push({ area: 'Delivery Plausibility', severity: 'low', detail: `Delivery capacity appears plausible relative to funding and staffing.` });
  }

  // Filing status factor
  if (fin.latestFilingStatus === 'missing') {
    deliveryPlausibilityScore = Math.max(deliveryPlausibilityScore - 25, 10);
    factors.push({ area: 'Compliance', severity: 'high', detail: 'Financial filings are missing. Unable to verify financial claims.' });
  } else if (fin.latestFilingStatus === 'late') {
    deliveryPlausibilityScore = Math.max(deliveryPlausibilityScore - 10, 20);
    factors.push({ area: 'Compliance', severity: 'moderate', detail: 'Financial filings are late. Timely reporting is expected of publicly funded organizations.' });
  }

  // --- Overall Score ---
  const overallCapacityScore = Math.round(
    staffingScore * 0.20 +
    infrastructureScore * 0.15 +
    revenueDiversityScore * 0.15 +
    programExpenseScore * 0.20 +
    dependencyScore * 0.10 +
    deliveryPlausibilityScore * 0.20
  );

  let riskLevel = 'low';
  if (overallCapacityScore < 40) riskLevel = 'high';
  else if (overallCapacityScore < 70) riskLevel = 'moderate';

  const humanReviewRequired = riskLevel !== 'low';

  return {
    staffingScore,
    infrastructureScore,
    revenueDiversityScore,
    programExpenseScore,
    dependencyScore,
    deliveryPlausibilityScore,
    overallCapacityScore,
    riskLevel,
    humanReviewRequired,
    factors,
  };
}

export function getRiskColor(level) {
  switch (level) {
    case 'low': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', ring: 'ring-green-500/20', badge: 'bg-green-100 text-green-800' };
    case 'moderate': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', ring: 'ring-yellow-500/20', badge: 'bg-yellow-100 text-yellow-800' };
    case 'high': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', ring: 'ring-red-500/20', badge: 'bg-red-100 text-red-800' };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground', ring: 'ring-muted', badge: 'bg-muted text-muted-foreground' };
  }
}

export function getScoreColor(score) {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function getScoreBgColor(score) {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}