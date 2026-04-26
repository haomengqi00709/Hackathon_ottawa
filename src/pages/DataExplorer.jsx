import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database, ChevronDown, ChevronUp, ChevronsUpDown, Search,
  ChevronLeft, ChevronRight, Copy, Check, Wifi, WifiOff,
  RefreshCw, ShieldAlert, GitBranch, Landmark, MapPin,
  AlertTriangle, Network, Table2, ChevronRight as Chevron,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEFAULT_API = 'http://localhost:8000';

// ── Sidebar preset definitions ─────────────────────────────────────────────
const SIDEBAR = [
  {
    category: 'Ghost Capacity',
    icon: ShieldAlert,
    color: 'text-red-500',
    queries: [
      { id: 'ghost_top',        label: 'Top Ghost Orgs',         sub: '16k+ orgs, 2023',       mode: 'named' },
      { id: 'impossibilities',  label: 'Impossible Filings',     sub: '54,010 records',         mode: 'named' },
      { id: 'plausibility_flags', label: 'Plausibility Flags',   sub: '1,075 records',          mode: 'named' },
    ],
  },
  {
    category: 'Funding Networks',
    icon: Network,
    color: 'text-blue-500',
    queries: [
      { id: 'funding_loops',  label: 'Circular Funding Loops',  sub: '5,808 loops detected',   mode: 'named' },
      { id: 'loop_universe',  label: 'Loop Participation Score', sub: 'Org-level loop scores',  mode: 'named' },
      { id: 'network_hubs',   label: 'Network Hubs',            sub: 'High-degree nodes',       mode: 'named' },
    ],
  },
  {
    category: 'Government Funding',
    icon: Landmark,
    color: 'text-purple-500',
    queries: [
      { id: 'govt_by_charity', label: 'Govt Funding by Charity', sub: '167K records',           mode: 'named' },
      { id: 'federal_grants',  label: 'Federal Grants',          sub: '1.27M records',          mode: 'named' },
    ],
  },
  {
    category: 'Alberta Data',
    icon: MapPin,
    color: 'text-orange-500',
    queries: [
      { id: 'ab_grants',   label: 'AB Provincial Grants',  sub: 'Grant amounts by recipient', mode: 'named' },
      {
        id: 'ab_nonprofits', label: 'AB Non-Profits',
        sub: 'Registered non-profits',
        mode: 'table', schema: 'ab', table: 'ab_non_profit', sort: null,
      },
    ],
  },
  {
    category: 'Browse All Tables',
    icon: Table2,
    color: 'text-muted-foreground',
    queries: [],
    isRaw: true,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n === null || n === undefined || n === '') return '';
  const x = Number(n);
  if (isNaN(x)) return String(n);
  if (Math.abs(x) >= 1_000_000_000) return (x / 1_000_000_000).toFixed(1) + 'B';
  if (Math.abs(x) >= 1_000_000)     return (x / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(x) >= 1_000)         return (x / 1_000).toFixed(1) + 'K';
  return x.toLocaleString();
}
function isNumType(t) {
  return t && (t.includes('int') || t.includes('numeric') || t.includes('float') ||
               t.includes('double') || t.includes('real') || t === 'money');
}
function typeColor(t) {
  if (!t) return '';
  if (t.includes('int') || t.includes('numeric') || t.includes('float')) return 'text-blue-500';
  if (t.includes('bool')) return 'text-purple-500';
  if (t.includes('date') || t.includes('time')) return 'text-green-500';
  return 'text-muted-foreground';
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DataExplorer() {
  const [apiUrl, setApiUrl]       = useState(() => localStorage.getItem('api_url') || DEFAULT_API);
  const [apiStatus, setApiStatus] = useState('unknown');

  // active query state
  const [activeId, setActiveId]     = useState('ghost_top');
  const [activeMode, setActiveMode] = useState('named'); // 'named' | 'table'

  // for table-browse mode
  const [schemas, setSchemas]   = useState([]);
  const [schema, setSchema]     = useState('cra');
  const [tables, setTables]     = useState([]);
  const [table, setTable]       = useState('');

  // data grid
  const [columns, setColumns]   = useState([]);
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);

  // grid controls
  const [search, setSearch]     = useState('');
  const [searchCol, setSearchCol] = useState('');
  const [sortCol, setSortCol]   = useState('');
  const [sortDir, setSortDir]   = useState('desc');
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [copied, setCopied]     = useState(null);

  const searchTimer = useRef(null);

  const saveApi = (u) => { setApiUrl(u); localStorage.setItem('api_url', u); };

  // health check
  const checkHealth = useCallback(async (url = apiUrl) => {
    try {
      const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) setApiStatus('ok'); else setApiStatus('error');
    } catch { setApiStatus('error'); }
  }, [apiUrl]);

  useEffect(() => { checkHealth(); }, []);

  // load schemas for table-browse mode
  useEffect(() => {
    if (apiStatus !== 'ok') return;
    fetch(`${apiUrl}/api/db/schemas`).then(r => r.json()).then(d => setSchemas(d.schemas || [])).catch(() => {});
  }, [apiStatus, apiUrl]);

  useEffect(() => {
    if (apiStatus !== 'ok' || !schema) return;
    setTable('');
    fetch(`${apiUrl}/api/db/tables?schema=${schema}`).then(r => r.json()).then(d => setTables(d.tables || [])).catch(() => {});
  }, [schema, apiStatus, apiUrl]);

  // ── load data ────────────────────────────────────────────────────────────
  const loadNamed = useCallback(async (id, resetPage = false) => {
    if (apiStatus !== 'ok') return;
    const p = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    setLoading(true);
    try {
      const r = await fetch(`${apiUrl}/api/named/${id}?limit=${pageSize}`);
      const d = await r.json();
      setColumns(d.columns || []);
      setRows(d.rows || []);
      setTotal(d.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [apiUrl, apiStatus, page, pageSize]);

  const loadTable = useCallback(async (resetPage = false) => {
    if (!table || apiStatus !== 'ok') return;
    const p = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    setLoading(true);
    try {
      const params = new URLSearchParams({ schema, table, limit: pageSize, offset: p * pageSize });
      if (sortCol) { params.set('sort_col', sortCol); params.set('sort_dir', sortDir); }
      if (search) { params.set('search', search); if (searchCol) params.set('search_col', searchCol); }

      const [dataRes, colRes] = await Promise.all([
        fetch(`${apiUrl}/api/db/data?${params}`).then(r => r.json()),
        columns.length ? Promise.resolve(null) : fetch(`${apiUrl}/api/db/columns?schema=${schema}&table=${table}`).then(r => r.json()),
      ]);
      if (colRes) setColumns(colRes.columns || []);
      setRows(dataRes.rows || []);
      setTotal(dataRes.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [table, schema, page, pageSize, sortCol, sortDir, search, searchCol, apiStatus, apiUrl, columns.length]);

  // trigger load when active query changes
  useEffect(() => {
    setColumns([]); setRows([]); setTotal(0); setPage(0); setSortCol(''); setSearch('');
    if (activeMode === 'named') loadNamed(activeId, true);
  }, [activeId, activeMode]);

  useEffect(() => {
    if (activeMode === 'table' && table) loadTable();
  }, [table, page, pageSize, sortCol, sortDir]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { if (activeMode === 'table' && table) loadTable(true); }, 400);
  }, [search, searchCol]);

  const handleSort = (col) => {
    if (activeMode === 'named') return; // named queries are pre-sorted
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const activatePreset = (q) => {
    setActiveId(q.id);
    if (q.mode === 'table') {
      setActiveMode('table');
      setSchema(q.schema);
      setTable(q.table);
      if (q.sort) setSortCol(q.sort);
    } else {
      setActiveMode('named');
    }
  };

  const activateRawTable = () => {
    setActiveId('__raw__');
    setActiveMode('table');
  };

  const copyCell = (val, key) => {
    navigator.clipboard.writeText(String(val ?? ''));
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const totalPages = Math.ceil(total / pageSize);

  // ── Sidebar section collapse ──────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState({});
  const toggle = (cat) => setCollapsed(s => ({ ...s, [cat]: !s[cat] }));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-4 lg:-m-6 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 border-r bg-muted/30 overflow-y-auto flex flex-col">
        {/* API status */}
        <div className="px-3 pt-3 pb-2 border-b">
          <div className="flex items-center gap-2 bg-background rounded-md px-2 py-1.5">
            {apiStatus === 'ok'
              ? <Wifi className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              : <WifiOff className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
            <Input
              value={apiUrl}
              onChange={e => saveApi(e.target.value)}
              onBlur={() => checkHealth(apiUrl)}
              className="h-6 text-[11px] border-0 bg-transparent p-0 focus-visible:ring-0 min-w-0"
            />
            <button onClick={() => checkHealth(apiUrl)} className="flex-shrink-0">
              <RefreshCw className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          {apiStatus === 'error' && (
            <p className="text-[10px] text-red-500 mt-1 px-1">
              Start: <code>uvicorn analysis_server:app --port 8000</code>
            </p>
          )}
        </div>

        {/* Query categories */}
        <nav className="flex-1 py-2">
          {SIDEBAR.map(section => {
            const Icon = section.icon;
            const isOpen = !collapsed[section.category];
            return (
              <div key={section.category} className="mb-1">
                <button
                  onClick={() => section.isRaw ? activateRawTable() : toggle(section.category)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors ${
                    activeId === '__raw__' && section.isRaw ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${section.color}`} />
                  <span className="flex-1 text-left">{section.category}</span>
                  {!section.isRaw && (
                    isOpen
                      ? <ChevronDown className="w-3 h-3" />
                      : <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                {!section.isRaw && isOpen && (
                  <div className="pb-1">
                    {section.queries.map(q => (
                      <button
                        key={q.id}
                        onClick={() => activatePreset(q)}
                        className={`w-full text-left px-4 py-1.5 hover:bg-muted transition-colors ${
                          activeId === q.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <div className={`text-xs font-medium ${activeId === q.id ? 'text-primary' : 'text-foreground'}`}>
                          {q.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{q.sub}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Raw table browser (shown when Browse All Tables is active) */}
          {activeId === '__raw__' && (
            <div className="px-3 pb-3 space-y-2 border-t pt-2">
              <div className="flex gap-1 flex-wrap">
                {(schemas.length ? schemas : ['cra','ab','fed','general']).map(s => (
                  <button
                    key={s}
                    onClick={() => setSchema(s)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      schema === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {tables.map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setTable(t.name); setColumns([]); setPage(0); }}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] hover:bg-muted transition-colors flex justify-between ${
                      table === t.name ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    <span className="font-mono truncate">{t.name}</span>
                    <span className="text-muted-foreground ml-1 flex-shrink-0">{fmtNum(t.rows)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* ── Main grid area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-background flex-shrink-0 flex-wrap">
          {/* Title */}
          <span className="text-sm font-semibold text-foreground">
            {activeId === '__raw__'
              ? (table ? `${schema}.${table}` : 'Select a table')
              : (SIDEBAR.flatMap(s => s.queries).find(q => q.id === activeId)?.label || activeId)}
          </span>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {loading ? '…' : `${total.toLocaleString()} rows`}
            </span>
          )}

          <div className="flex-1" />

          {/* Search — only for table mode */}
          {activeMode === 'table' && table && (
            <>
              <Select value={searchCol || '__all__'} onValueChange={v => setSearchCol(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All text</SelectItem>
                  {columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-7 text-xs w-44"
                />
              </div>
            </>
          )}

          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[50,100,200,500].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>

          {activeMode === 'named' && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => loadNamed(activeId, true)}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-8 border-b">#</th>
                {columns.map(col => (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className={`px-3 py-2 text-left font-semibold border-b whitespace-nowrap select-none group ${
                      activeMode === 'table' ? 'cursor-pointer hover:bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.name}</span>
                      <span className={`text-[9px] font-normal ${typeColor(col.type)}`}>{col.type}</span>
                      {activeMode === 'table' && (sortCol === col.name
                        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />)
                        : <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-60" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b hover:bg-muted/40 transition-colors">
                  <td className="px-2 py-1.5 text-muted-foreground tabular-nums text-[11px]">{page * pageSize + i + 1}</td>
                  {columns.map(col => {
                    const val = row[col.name];
                    const cellKey = `${i}-${col.name}`;
                    const isNum = isNumType(col.type) || (typeof val === 'number');
                    return (
                      <td
                        key={col.name}
                        className={`px-3 py-1.5 group relative ${isNum ? 'text-right tabular-nums' : ''}`}
                      >
                        {val === null || val === undefined ? (
                          <span className="text-muted-foreground/30 italic text-[10px]">null</span>
                        ) : isNum ? (
                          <span title={String(val)}>{fmtNum(val)}</span>
                        ) : (
                          <span className="truncate block max-w-[220px]" title={String(val)}>
                            {String(val).length > 80 ? String(val).slice(0, 80) + '…' : String(val)}
                          </span>
                        )}
                        <button
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted"
                          onClick={() => copyCell(val, cellKey)}
                        >
                          {copied === cellKey
                            ? <Check className="w-3 h-3 text-green-500" />
                            : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-20 text-muted-foreground">
                    {apiStatus !== 'ok'
                      ? 'Start the analysis server to query data'
                      : activeId === '__raw__' && !table
                        ? 'Select a table from the sidebar'
                        : 'No data'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — table mode only */}
        {activeMode === 'table' && total > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-6 w-6" disabled={page === 0} onClick={() => setPage(0)}>
                <ChevronLeft className="w-3 h-3" /><ChevronLeft className="w-3 h-3 -ml-2" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs px-2 tabular-nums">pg {page + 1}/{totalPages || 1}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
                <ChevronRight className="w-3 h-3" /><ChevronRight className="w-3 h-3 -ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
