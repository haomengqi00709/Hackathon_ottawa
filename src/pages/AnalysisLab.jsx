import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlaskConical, Wifi, WifiOff, RefreshCw, SlidersHorizontal, BarChart3, Users, DollarSign, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiBase } from '@/api/httpClient';

// Default points at funding-data-backend (Express, port 4000).
const DEFAULT_API_URL = apiBase();

const DEFAULT_GHOST_W = { no_employees: 3, govt_dependency: 2, no_programs: 3, comp_no_staff: 2 };
const DEFAULT_CAP_W   = { staffing: 20, delivery: 25, program: 25, revenue: 15, infra: 10, compliance: 5 };

const GHOST_LABELS = {
  no_employees:    'Zero Paid Employees',
  govt_dependency: 'Govt Revenue ≥ 90%',
  no_programs:     'Program Spend < 10%',
  comp_no_staff:   'Compensation with No Staff',
};
const CAP_LABELS = {
  staffing:   'Staffing',
  delivery:   'Delivery Plausibility',
  program:    'Program Expense',
  revenue:    'Revenue Diversity',
  infra:      'Infrastructure',
  compliance: 'Compliance',
};

function fmt(n) {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function GhostBar({ score }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? '#dc2626' : score >= 5 ? '#ea580c' : '#ca8a04';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}/10</span>
    </div>
  );
}

export default function AnalysisLab() {
  // Use a Lab-scoped storage key so it doesn't fight with the legacy 'api_url'
  // key (which used to point at a now-retired FastAPI on :8000).
  const [apiUrl, setApiUrl]         = useState(() => localStorage.getItem('lab_api_url') || DEFAULT_API_URL);
  const [apiStatus, setApiStatus]   = useState('unknown'); // 'ok' | 'error' | 'unknown'
  const [recordCount, setRecordCount] = useState(null);

  const [ghostW, setGhostW]         = useState(DEFAULT_GHOST_W);
  const [capW, setCapW]             = useState(DEFAULT_CAP_W);
  const [province, setProvince]     = useState('all');
  const [minGovt, setMinGovt]       = useState(100);   // $K
  const [fiscalYear, setFiscalYear] = useState(2023);
  const [sortBy, setSortBy]         = useState('ghost_desc');
  const [dbStats, setDbStats]       = useState(null);

  const [results, setResults]       = useState([]);
  const [groupData, setGroupData]   = useState([]);
  const [groupBy, setGroupBy]       = useState('province');
  const [loading, setLoading]       = useState(false);
  const [tab, setTab]               = useState('score');

  const debounceRef = useRef(null);

  const saveApiUrl = (url) => {
    setApiUrl(url);
    localStorage.setItem('lab_api_url', url);
  };

  const checkHealth = useCallback(async (url = apiUrl) => {
    try {
      const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      setApiStatus('ok');
      setRecordCount(d.records);
    } catch {
      setApiStatus('error');
      setRecordCount(null);
    }
  }, [apiUrl]);

  useEffect(() => { checkHealth(); }, []);

  // Load DB summary stats when API comes online
  useEffect(() => {
    if (apiStatus !== 'ok') return;
    fetch(`${apiUrl}/api/ghost_stats?fiscal_year=${fiscalYear}&min_govt=${minGovt * 1000}`)
      .then(r => r.json()).then(setDbStats).catch(() => {});
  }, [apiStatus, apiUrl, fiscalYear, minGovt]);

  const runScore = useCallback(async () => {
    if (apiStatus !== 'ok') return;
    setLoading(true);
    try {
      const body = {
        ghost_weights: ghostW,
        fiscal_year: fiscalYear,
        province: province === 'all' ? null : province,
        min_govt: minGovt * 1000,
        limit: 200,
      };
      const r = await fetch(`${apiUrl}/api/ghost_query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      setResults(d.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, apiStatus, ghostW, fiscalYear, province, minGovt]);

  const runGroups = useCallback(async () => {
    if (apiStatus !== 'ok') return;
    try {
      const r = await fetch(`${apiUrl}/api/groups?by=${groupBy}`);
      const d = await r.json();
      setGroupData(d.groups || []);
    } catch {}
  }, [apiUrl, apiStatus, groupBy]);

  useEffect(() => {
    if (tab === 'score') {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(runScore, 500);
    } else {
      runGroups();
    }
  }, [ghostW, fiscalYear, province, minGovt, sortBy, tab, runScore, runGroups]);

  const highConcern  = results.filter(r => r.ghostScore >= 8).length;
  const totalAtRisk  = results.reduce((s, r) => s + (r.govtRevenue || 0), 0);
  const avgGhost     = results.length ? (results.reduce((s, r) => s + r.ghostScore, 0) / results.length).toFixed(1) : '—';

  const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Analysis Lab
          </h1>
          <p className="text-sm text-muted-foreground">
            Live re-scoring against full CRA dataset
            {dbStats && <span className="ml-1 text-primary font-medium">— {dbStats.total.toLocaleString()} orgs in scope</span>}
          </p>
        </div>

        {/* API connection bar */}
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          {apiStatus === 'ok'
            ? <Wifi className="w-4 h-4 text-green-500 flex-shrink-0" />
            : <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />}
          <Input
            value={apiUrl}
            onChange={e => saveApiUrl(e.target.value)}
            onBlur={() => checkHealth(apiUrl)}
            className="h-7 text-xs w-52 border-0 bg-transparent p-0 focus-visible:ring-0"
            placeholder="http://localhost:8000"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => checkHealth(apiUrl)}>
            <RefreshCw className="w-3 h-3" />
          </Button>
          {apiStatus === 'ok' && recordCount && (
            <span className="text-xs text-green-600 font-medium">{recordCount} records</span>
          )}
          {apiStatus === 'error' && (
            <span className="text-xs text-red-500">Offline — start server first</span>
          )}
        </div>
      </div>

      {apiStatus === 'error' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Backend not reachable.</strong> Start the API:{' '}
          <code className="bg-amber-100 px-1 rounded">cd funding-data-backend && npm run dev</code>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="score" className="gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5" />Score Lab</TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Group Analysis</TabsTrigger>
        </TabsList>

        {/* ── SCORE LAB ─────────────────────────────────────────── */}
        <TabsContent value="score" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-[320px_1fr] gap-4">

            {/* Controls panel */}
            <div className="space-y-4">

              {/* Ghost score weights */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Ghost Score Weights</CardTitle>
                  <p className="text-xs text-muted-foreground">Drag to change how each flag contributes to the 0–10 ghost score</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  {Object.entries(GHOST_LABELS).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">{label}</Label>
                        <span className="text-xs font-bold tabular-nums text-primary">{ghostW[key]}</span>
                      </div>
                      <Slider
                        min={0} max={6} step={0.5}
                        value={[ghostW[key]]}
                        onValueChange={([v]) => setGhostW(w => ({ ...w, [key]: v }))}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline" size="sm" className="w-full mt-1 text-xs"
                    onClick={() => setGhostW(DEFAULT_GHOST_W)}
                  >
                    Reset to defaults
                  </Button>
                </CardContent>
              </Card>

              {/* Capacity dimension weights */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Capacity Dimension Weights (%)</CardTitle>
                  <p className="text-xs text-muted-foreground">Must total 100</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {Object.entries(CAP_LABELS).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">{label}</Label>
                        <span className="text-xs font-bold tabular-nums text-primary">{capW[key]}%</span>
                      </div>
                      <Slider
                        min={0} max={60} step={5}
                        value={[capW[key]]}
                        onValueChange={([v]) => setCapW(w => ({ ...w, [key]: v }))}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline" size="sm" className="w-full text-xs"
                    onClick={() => setCapW(DEFAULT_CAP_W)}
                  >
                    Reset to defaults
                  </Button>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Filters</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fiscal Year</Label>
                    <Select value={String(fiscalYear)} onValueChange={v => setFiscalYear(Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2024,2023,2022,2021,2020].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Province</Label>
                    <Select value={province} onValueChange={setProvince}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Provinces</SelectItem>
                        {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Min Govt Funding: <strong>{minGovt === 0 ? 'Any' : `≥ $${minGovt}K`}</strong></Label>
                    <Slider min={0} max={5000} step={50} value={[minGovt]} onValueChange={([v]) => setMinGovt(v)} />
                  </div>

                  {dbStats && (
                    <div className="rounded-lg bg-muted p-2.5 space-y-1 text-xs">
                      <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">In Scope ({fiscalYear})</div>
                      <div className="flex justify-between"><span>Total orgs</span><strong>{dbStats.total.toLocaleString()}</strong></div>
                      <div className="flex justify-between"><span>Zero compensation</span><strong className="text-red-600">{dbStats.zero_comp.toLocaleString()}</strong></div>
                      <div className="flex justify-between"><span>Govt dep ≥90%</span><strong className="text-orange-600">{dbStats.high_govt_dep.toLocaleString()}</strong></div>
                      <div className="flex justify-between"><span>Low program spend</span><strong className="text-orange-600">{dbStats.low_programs.toLocaleString()}</strong></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results panel */}
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Matching', value: results.length, icon: Users, color: 'text-primary' },
                  { label: 'High Concern', value: highConcern, icon: FlaskConical, color: 'text-red-600' },
                  { label: 'Avg Ghost', value: avgGhost, icon: SlidersHorizontal, color: 'text-orange-500' },
                  { label: 'Govt $$ at Risk', value: fmt(totalAtRisk), icon: DollarSign, color: 'text-emerald-600' },
                ].map(s => (
                  <Card key={s.label} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    </div>
                    <p className={`text-xl font-bold tabular-nums ${s.color}`}>{loading ? '…' : s.value}</p>
                  </Card>
                ))}
              </div>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="pl-4">#</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Province</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Ghost Score</TableHead>
                          <TableHead>Govt Revenue</TableHead>
                          <TableHead className="hidden xl:table-cell">Prog %</TableHead>
                          <TableHead className="hidden xl:table-cell">Flags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.slice(0, 100).map((r, i) => (
                          <TableRow key={r.bn} className={r.ghostScore >= 8 ? 'bg-red-50/50' : ''}>
                            <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-xs font-medium leading-snug max-w-[200px] truncate">{r.name}</p>
                                <p className="text-[10px] text-muted-foreground">{r.bn}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{r.province || '—'}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold ${r.employees === 0 ? 'text-red-600' : 'text-foreground'}`}>
                                {r.employees === 0 ? '0 ⚠' : r.employees}
                              </span>
                            </TableCell>
                            <TableCell><GhostBar score={r.ghostScore} /></TableCell>
                            <TableCell className="text-xs tabular-nums">{fmt(r.govtRevenue)}</TableCell>
                            <TableCell className="hidden xl:table-cell text-xs tabular-nums">
                              <span className={r.programSpendPct < 20 ? 'text-red-600' : ''}>
                                {r.programSpendPct?.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <div className="flex flex-wrap gap-0.5">
                                {(r.ghostFlags || []).slice(0, 2).map(f => (
                                  <span key={f} className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded">
                                    {f.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {results.length === 0 && !loading && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                              {apiStatus === 'ok' ? 'No results match the current filters' : 'Start the analysis server to see live results'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── GROUP ANALYSIS ────────────────────────────────────── */}
        <TabsContent value="groups" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Group by</Label>
            <Select value={groupBy} onValueChange={v => { setGroupBy(v); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="province">Province</SelectItem>
                <SelectItem value="risk">Risk Level</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={runGroups}>Refresh</Button>
          </div>

          {groupData.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Bar chart */}
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Organizations by {groupBy}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={groupData.slice(0, 15)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="group" type="category" width={60} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v, n) => [v, n === 'count' ? 'Organizations' : n]}
                        labelStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {groupData.slice(0, 15).map((entry, i) => (
                          <Cell key={i} fill={entry.avg_ghost >= 8 ? '#dc2626' : entry.avg_ghost >= 5 ? '#ea580c' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="pl-4">{groupBy === 'province' ? 'Province' : groupBy === 'risk' ? 'Risk Level' : 'Category'}</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Zero Staff</TableHead>
                        <TableHead className="text-right">Avg Ghost</TableHead>
                        <TableHead className="text-right">Total Govt $$</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupData.map(g => (
                        <TableRow key={g.group}>
                          <TableCell className="pl-4 font-medium text-sm">{g.group}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{g.count}</TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm tabular-nums ${g.zero_employees > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                              {g.zero_employees}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm font-bold tabular-nums ${g.avg_ghost >= 8 ? 'text-red-600' : g.avg_ghost >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                              {g.avg_ghost}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{fmt(g.total_govt_cad)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {groupData.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {apiStatus === 'ok' ? 'Loading group data…' : 'Start the analysis server to use Group Analysis'}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
