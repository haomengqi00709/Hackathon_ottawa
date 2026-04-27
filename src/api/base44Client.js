// Selects the active backend client based on Vite env flags.
//
//   default                          → httpBase44 (funding-data-backend Express API)
//   VITE_DATA_SOURCE=supabase        → legacy Supabase client (this file's bottom half)
//
// Set VITE_API_BASE_URL=http://localhost:4000 (or wherever the Express API runs)
// in .env.local. Falls back to localStorage 'funding_api_url' or http://localhost:4000.

import { createClient } from '@supabase/supabase-js';
import { httpBase44, httpCraApi } from './httpClient';

const SUPABASE_URL  = 'https://sszyjgyzuqmudzjttadd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzenlqZ3l6dXFtdWR6anR0YWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjg1NDcsImV4cCI6MjA5Mjc0NDU0N30.nhNQyd2-80MZ_8ZQQPxzM506asXvgnVXwLGfAsibK_s';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

function makeSupabaseEntity(table) {
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
      const where = typeof criteria === 'string' ? { id: criteria } : criteria;
      let q = sb.from(table).update(updates);
      Object.entries(where).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data } = await q.select().single();
      return data;
    },
    delete: async (criteria) => {
      const where = typeof criteria === 'string' ? { id: criteria } : criteria;
      let q = sb.from(table).delete();
      Object.entries(where).forEach(([k, v]) => { q = q.eq(k, v); });
      await q;
      return true;
    },
  };
}

const supabaseBase44 = {
  entities: {
    Organizations:       makeSupabaseEntity('organizations'),
    FinancialIndicators: makeSupabaseEntity('financial_indicators'),
    FundingRecords:      makeSupabaseEntity('funding_records'),
    CapacityAssessments: makeSupabaseEntity('capacity_assessments'),
    EvidenceItems:       makeSupabaseEntity('evidence_items'),
    ReviewDecisions:     makeSupabaseEntity('review_decisions'),
    Benchmarks:          makeSupabaseEntity('benchmarks'),
    BenchmarkMappings:   makeSupabaseEntity('benchmark_mappings'),
  },
  auth: {
    me: async () => ({ id: 'demo-user', name: 'Demo Reviewer', email: 'demo@hackathon.ca' }),
    logout: () => {},
    redirectToLogin: () => {},
  },
  functions: {
    invoke: async () => null,
  },
  integrations: {
    Core: {
      InvokeLLM: async ({ prompt }) => {
        // Local fallback narrator (mirrors the prior implementation).
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

// Legacy CRA api shim — pre-existing FastAPI on :8000. Preserved for users still on it.
const getCRABase = () => localStorage.getItem('api_url') || 'http://localhost:8000';
async function fetchLegacyCRA(path) {
  const r = await fetch(`${getCRABase()}${path}`);
  if (!r.ok) throw new Error(`CRA API error: ${r.status}`);
  return r.json();
}
const legacyCraApi = {
  entities: {
    Organizations: {
      list: () =>
        fetchLegacyCRA('/api/engine/organizations?limit=500').then((d) =>
          (d.organizations || []).map((org) => ({
            ...org,
            website: org.websitePresent ? 'https://exists' : '',
            missionDescription: org.programDescriptionPresent ? 'Program description present.' : '',
            jurisdiction: org.province,
          })),
        ),
    },
    FinancialIndicators: {
      list: () =>
        fetchLegacyCRA('/api/engine/financials?limit=500').then((d) =>
          (d.financials || [])
            .sort((a, b) => (b.fiscalYear || 0) - (a.fiscalYear || 0))
            .map((f) => ({
              ...f,
              totalRevenue: Number(f.totalRevenue) || 0,
              totalExpenses: Number(f.totalExpenses) || 0,
              programExpense: Number(f.programExpense) || 0,
              compensationExpense: Number(f.compensationExpense) || 0,
              governmentRevenue: Number(f.governmentRevenue) || 0,
            })),
        ),
    },
    FundingRecords: { list: () => Promise.resolve([]) },
    CapacityAssessments: { list: () => Promise.resolve([]) },
  },
};

const dataSource = (import.meta.env.VITE_DATA_SOURCE || 'http').toLowerCase();

export const base44 =
  dataSource === 'supabase'
    ? supabaseBase44
    : httpBase44;

export const craApi =
  dataSource === 'legacy-fastapi'
    ? legacyCraApi
    : httpCraApi;

// Expose the chosen source for the layout footer / debug.
export const activeDataSource = dataSource;
