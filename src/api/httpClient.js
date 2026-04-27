// HTTP adapter for the funding-data-backend Express API.
// Preserves the base44 entity surface the existing FE was written against:
//   base44.entities.<Name>.{ list, filter, create, update, delete }
// Plus base44.auth.me / .functions.invoke / .integrations.Core.InvokeLLM.

const DEFAULT_BASE = 'http://localhost:4000';

export const apiBase = () =>
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.localStorage?.getItem('funding_api_url')) ||
  DEFAULT_BASE;

async function req(path, init = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`API ${path}: ${msg}`);
  }
  return json?.data ?? null;
}

function qs(criteria = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(criteria)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// Lower-level: returns `{data, meta}` from the server unwrapped (req() already
// drops the outer envelope and returns json.data; we want the meta too).
async function reqEnvelope(path, init = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  let json;
  try { json = await res.json(); } catch { json = null; }
  if (!res.ok) {
    const msg = json?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`API ${path}: ${msg}`);
  }
  return { data: json?.data ?? null, meta: json?.meta ?? null };
}

// `update(idOrCriteria, body)` — accept either a string id or `{ id }`/criteria.
//
// listPage({offset, limit, ...filters}) → { data: [...], meta: { count, total,
//   offset, limit, nextOffset } }. Use this when the FE wants to render real
// pagination controls.
//
// listAll({maxRecords?, pageSize?, ...filters}) → returns the FULL filtered
// data set, fetching pages until exhausted. Default safety cap maxRecords=20000.
// Use sparingly — most lists should be paginated explicitly via listPage.
function makeEntity(basePath) {
  return {
    list: () => req(basePath).then((d) => d ?? []),
    filter: (criteria = {}) => req(`${basePath}${qs(criteria)}`).then((d) => d ?? []),

    listPage: ({ offset = 0, limit = 50, ...filters } = {}) =>
      reqEnvelope(`${basePath}${qs({ ...filters, offset, limit })}`),

    listAll: async ({ maxRecords = 20000, pageSize = 1000, ...filters } = {}) => {
      const all = [];
      let offset = 0;
      let total = null;
      // Loop until server says nextOffset is null OR we hit safety cap.
      // Limits HTTP rounds to maxRecords/pageSize at the worst.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, meta } = await reqEnvelope(
          `${basePath}${qs({ ...filters, offset, limit: pageSize })}`,
        );
        if (Array.isArray(data)) all.push(...data);
        total = meta?.total ?? total;
        if (!meta?.nextOffset || all.length >= maxRecords) break;
        offset = meta.nextOffset;
      }
      return { data: all, total };
    },

    create: (body) =>
      req(basePath, { method: 'POST', body: JSON.stringify(body) }),
    update: (idOrCriteria, body) => {
      const id =
        typeof idOrCriteria === 'string'
          ? idOrCriteria
          : idOrCriteria?.id;
      if (!id) throw new Error('update() requires an id');
      return req(`${basePath}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    delete: (idOrCriteria) => {
      const id =
        typeof idOrCriteria === 'string'
          ? idOrCriteria
          : idOrCriteria?.id;
      if (!id) throw new Error('delete() requires an id');
      return req(`${basePath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  };
}

// Re-export for pages that hit /api/loops/... and similar non-entity endpoints.
export { reqEnvelope };

// Convenience for the Dashboard (and anywhere else that wants summary numbers
// without paging through 851K rows).
export async function fetchOrgsStats() {
  const { data } = await reqEnvelope('/api/orgs/stats');
  return data;
}

export const httpBase44 = {
  entities: {
    Organizations:       makeEntity('/api/orgs'),
    FinancialIndicators: makeEntity('/api/financials'),
    FundingRecords:      makeEntity('/api/funding'),
    CapacityAssessments: makeEntity('/api/assessments'),
    EvidenceItems:       makeEntity('/api/evidence'),
    ReviewDecisions:     makeEntity('/api/decisions'),
    Benchmarks:          makeEntity('/api/benchmarks'),
    BenchmarkMappings:   makeEntity('/api/benchmark-mappings'),
  },

  auth: {
    me: async () => ({
      id: 'demo-user',
      name: 'Demo Reviewer',
      email: 'demo@hackathon.ca',
    }),
    logout: () => {},
    redirectToLogin: () => {},
  },

  integrations: {
    Core: {
      InvokeLLM: async ({ prompt, model } = {}) => {
        try {
          const out = await req('/api/llm/invoke', {
            method: 'POST',
            body: JSON.stringify({ prompt, model }),
          });
          return out?.text ?? '';
        } catch (e) {
          return `[LLM unavailable: ${e?.message || 'error'}]`;
        }
      },
    },
  },

  // Stubs the FE's base44.functions.invoke('validateExternalPresence', ...)
  // until a real implementation is added (e.g. via Anthropic + a web-search tool).
  functions: {
    invoke: async (name, _args) => {
      if (name === 'validateExternalPresence') {
        return {
          status: 'unavailable',
          message:
            'External validation is not wired in this backend yet; gracefully degraded.',
          checks: [],
        };
      }
      return null;
    },
  },
};

// CRA-data-shaped client: maps the same Express endpoints into the
// craApi shape that pages like CredibilityEngine and DecisionEngine expect.
export const httpCraApi = {
  entities: {
    Organizations: { list: () => req('/api/orgs?limit=200').then((d) => d ?? []) },
    FinancialIndicators: {
      list: () =>
        // Sort desc so [0] is the latest year (mirrors prior behaviour).
        req('/api/financials').then((d) =>
          (d ?? []).sort(
            (a, b) => (Number(b.fiscalYear) || 0) - (Number(a.fiscalYear) || 0),
          ),
        ),
    },
    FundingRecords: { list: () => req('/api/funding').then((d) => d ?? []) },
    CapacityAssessments: {
      list: () => req('/api/assessments').then((d) => d ?? []),
    },
  },
};
