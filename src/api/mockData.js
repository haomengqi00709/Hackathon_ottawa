import orgs        from '@/data/organizations.json';
import fins        from '@/data/financials.json';
import funds       from '@/data/funding_records.json';
import assessments from '@/data/assessments.json';
import evidence    from '@/data/evidence_items.json';
import decisions   from '@/data/review_decisions.json';
import benchmarks  from '@/data/benchmarks.json';

// In-memory stores so create/update/delete work during the session
const stores = {
  Organizations:      [...orgs],
  FinancialIndicators:[...fins],
  FundingRecords:     [...funds],
  CapacityAssessments:[...assessments],
  EvidenceItems:      [...evidence],
  ReviewDecisions:    [...decisions],
  Benchmarks:         [...benchmarks],
};

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeEntity(storeName) {
  return {
    list: async () => [...stores[storeName]],

    filter: async (criteria = {}) => {
      return stores[storeName].filter(record =>
        Object.entries(criteria).every(([k, v]) => record[k] === v)
      );
    },

    create: async (data) => {
      const record = { id: makeId(), ...data };
      stores[storeName].push(record);
      return record;
    },

    update: async (criteria, data) => {
      const idx = stores[storeName].findIndex(r =>
        Object.entries(criteria).every(([k, v]) => r[k] === v)
      );
      if (idx !== -1) {
        stores[storeName][idx] = { ...stores[storeName][idx], ...data };
        return stores[storeName][idx];
      }
      return null;
    },

    delete: async (criteria) => {
      const before = stores[storeName].length;
      stores[storeName] = stores[storeName].filter(r =>
        !Object.entries(criteria).every(([k, v]) => r[k] === v)
      );
      return stores[storeName].length < before;
    },
  };
}

export const mockBase44 = {
  auth: {
    me: async () => ({ id: 'mock-user', name: 'Demo User', email: 'demo@hackathon.ca' }),
    logout: () => {},
    redirectToLogin: () => {},
  },

  entities: {
    Organizations:       makeEntity('Organizations'),
    FinancialIndicators: makeEntity('FinancialIndicators'),
    FundingRecords:      makeEntity('FundingRecords'),
    CapacityAssessments: makeEntity('CapacityAssessments'),
    EvidenceItems:       makeEntity('EvidenceItems'),
    ReviewDecisions:     makeEntity('ReviewDecisions'),
    Benchmarks:          makeEntity('Benchmarks'),
  },

  integrations: {
    Core: {
      InvokeLLM: async ({ prompt }) => {
        // Extract org name and score from prompt if present
        const nameMatch  = prompt.match(/Organization:\s*(.+?)\s*\(/);
        const scoreMatch = prompt.match(/Overall Capacity Score:\s*(\d+)/);
        const riskMatch  = prompt.match(/Risk Nature Classification:\s*(.+)/);
        const name  = nameMatch?.[1]  || 'This organization';
        const score = scoreMatch?.[1] || '?';
        const risk  = riskMatch?.[1]?.trim() || 'High Concern';

        if (risk.includes('High Concern')) {
          return `${name} presents significant inconsistencies between claimed capacity and observable financial evidence, resulting in an overall capacity score of ${score}/100. The combination of near-zero program delivery spending, government revenue concentration, and workforce gaps warrants enhanced due diligence before any funding determination. Recommend escalation to a senior reviewer for verification of operational claims.`;
        }
        if (risk.includes('Overstretched')) {
          return `${name} demonstrates genuine organizational activity but the proposed scope and funding level appear to exceed current operational capacity, as reflected in a capacity score of ${score}/100. A milestone-based funding approach or scope reduction would better align commitments with observable delivery infrastructure. Recommend structured renewal with performance benchmarks.`;
        }
        if (risk.includes('Underdeveloped')) {
          return `${name} shows mission alignment and early-stage activity, but current staffing and infrastructure do not yet support the scale of funding requested, yielding a capacity score of ${score}/100. A capacity-building funding stream or reduced initial grant may be more appropriate at this stage of organizational development.`;
        }
        return `${name} demonstrates proportionate alignment between funding level and observable operational capacity, with an overall score of ${score}/100. No material capacity concerns were identified through automated screening. Standard renewal conditions apply.`;
      },
    },
  },
};
