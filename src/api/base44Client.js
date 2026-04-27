import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://sszyjgyzuqmudzjttadd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzenlqZ3l6dXFtdWR6anR0YWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjg1NDcsImV4cCI6MjA5Mjc0NDU0N30.nhNQyd2-80MZ_8ZQQPxzM506asXvgnVXwLGfAsibK_s';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

function makeEntity(table) {
  return {
    list: async () => {
      const { data } = await sb.from(table).select('*');
      return data || [];
    },
    filter: async (criteria = {}) => {
      let q = sb.from(table).select('*');
      Object.entries(criteria).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data } = await q;
      return data || [];
    },
    create: async (record) => {
      const { data } = await sb.from(table).insert(record).select().single();
      return data;
    },
    update: async (criteria, updates) => {
      let q = sb.from(table).update(updates);
      Object.entries(criteria).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data } = await q.select().single();
      return data;
    },
    delete: async (criteria) => {
      let q = sb.from(table).delete();
      Object.entries(criteria).forEach(([k, v]) => { q = q.eq(k, v); });
      await q;
      return true;
    },
  };
}

// ── CRA live data client — calls local FastAPI instead of Supabase ────────────
const getCRABase = () => localStorage.getItem('api_url') || 'http://localhost:8000';

async function fetchCRA(path) {
  const r = await fetch(`${getCRABase()}${path}`);
  if (!r.ok) throw new Error(`CRA API error: ${r.status}`);
  return r.json();
}

export const craApi = {
  entities: {
    Organizations: {
      list: () => fetchCRA('/api/engine/organizations?limit=500').then(d =>
        (d.organizations || []).map(org => ({
          ...org,
          // buildMismatchInput reads these as strings, not booleans
          website: org.websitePresent ? 'https://exists' : '',
          missionDescription: org.programDescriptionPresent ? 'Program description present.' : '',
          jurisdiction: org.province,
        }))
      ),
    },
    FinancialIndicators: {
      list: () => fetchCRA('/api/engine/financials?limit=500').then(d =>
        // Sort descending so financials[0] in buildMismatchInput is the latest year
        (d.financials || []).sort((a, b) => (b.fiscalYear || 0) - (a.fiscalYear || 0)).map(f => ({
          ...f,
          totalRevenue: Number(f.totalRevenue) || 0,
          totalExpenses: Number(f.totalExpenses) || 0,
          programExpense: Number(f.programExpense) || 0,
          compensationExpense: Number(f.compensationExpense) || 0,
          governmentRevenue: Number(f.governmentRevenue) || 0,
        }))
      ),
    },
    FundingRecords: {
      list: () => Promise.resolve([]),
    },
    CapacityAssessments: {
      list: () => Promise.resolve([]),
    },
  },
};

export const base44 = {
  entities: {
    Organizations:       makeEntity('organizations'),
    FinancialIndicators: makeEntity('financial_indicators'),
    FundingRecords:      makeEntity('funding_records'),
    CapacityAssessments: makeEntity('capacity_assessments'),
    EvidenceItems:       makeEntity('evidence_items'),
    ReviewDecisions:     makeEntity('review_decisions'),
    Benchmarks:          makeEntity('benchmarks'),
  },

  auth: {
    me: async () => ({ id: 'demo-user', name: 'Demo Reviewer', email: 'demo@hackathon.ca' }),
    logout: () => {},
    redirectToLogin: () => {},
  },

  integrations: {
    Core: {
      InvokeLLM: async ({ prompt }) => {
        const scoreMatch = prompt.match(/Overall Capacity Score:\s*(\d+)/);
        const riskMatch  = prompt.match(/Risk Nature Classification:\s*(.+)/);
        const nameMatch  = prompt.match(/Organization:\s*(.+?)\s*\(/);
        const score = scoreMatch?.[1] || '?';
        const risk  = riskMatch?.[1]?.trim() || '';
        const name  = nameMatch?.[1] || 'This organization';

        if (risk.includes('High Concern'))
          return `${name} presents significant inconsistencies between claimed capacity and observable financial evidence, with an overall score of ${score}/100. Near-zero program delivery spending and government revenue concentration exceeding 90% warrant enhanced due diligence before any funding determination. Recommend escalation to a senior reviewer for verification of operational claims.`;
        if (risk.includes('Overstretched'))
          return `${name} demonstrates genuine activity but the proposed funding level appears to exceed current operational capacity, scoring ${score}/100. A milestone-based funding approach would better align commitments with observable delivery infrastructure.`;
        if (risk.includes('Underdeveloped'))
          return `${name} shows mission alignment but current staffing and infrastructure do not yet support the funding requested, yielding a score of ${score}/100. A capacity-building stream or reduced initial grant may be more appropriate.`;
        return `${name} demonstrates proportionate alignment between funding and observable capacity, scoring ${score}/100. Standard renewal conditions apply.`;
      },
    },
  },
};
