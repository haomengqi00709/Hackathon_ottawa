import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Ghost, AlertTriangle, TrendingDown, Repeat,
  Search, Loader2, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PaginationBar from '@/components/PaginationBar';
import { fetchGhostsStats, fetchGhostDetail, reqEnvelope } from '@/api/httpClient';
import { keepPreviousData } from '@tanstack/react-query';

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmtCAD = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(n));

const fmtBillions = (n) =>
  n == null ? '—' : `$${(Number(n) / 1e9).toFixed(1)} B`;

const fmtPct = (ratio) =>
  ratio == null ? '—' : `${(Number(ratio) * 100).toFixed(1)}%`;

// ─── Rule color maps ─────────────────────────────────────────────────────────
const RULE_COLORS = {
  R1: 'bg-amber-100 text-amber-800 border-amber-300',
  R2: 'bg-orange-100 text-orange-800 border-orange-300',
  R3: 'bg-red-100 text-red-800 border-red-300',
};

function RuleChip({ rule }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${RULE_COLORS[rule] ?? 'bg-gray-100 text-gray-700'}`}>
      {rule}
    </span>
  );
}

// ─── Stats pill row ───────────────────────────────────────────────────────────
function StatsPills({ stats }) {
  if (!stats) return null;
  const pills = [
    { label: 'Total ghosts', value: stats.total?.toLocaleString() ?? '—', icon: Ghost },
    { label: 'R1 inactive after funding', value: stats.byRule?.R1?.toLocaleString() ?? '—', icon: AlertTriangle },
    { label: 'R2 funding without activity', value: stats.byRule?.R2?.toLocaleString() ?? '—', icon: TrendingDown },
    { label: 'R3 in gifting loop', value: stats.byRule?.R3?.toLocaleString() ?? '—', icon: Repeat },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {pills.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <span className="text-2xl font-bold tabular-nums">{value}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground px-1">
        Total flagged funding: <strong className="text-foreground">{fmtBillions(stats.totalFlaggedFunding)}</strong>
      </p>
    </div>
  );
}

// ─── Collapsible "How rules work" panel ──────────────────────────────────────
function HowRulesWork() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border">
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/30 rounded-xl transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>How rules work</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 px-5 space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-foreground">R1 — Inactive after funding: </span>
              Entity received &gt;$50K within last 3 years AND is currently in a non-active legal status
              (AB Struck/Cancelled/Dissolved/Inactive/Amalgamated) OR stopped filing CRA T3010 ≥2 years ago.
            </div>
          </div>
          <div className="flex gap-3">
            <TrendingDown className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-foreground">R2 — Funding without activity: </span>
              Entity received &gt;$50K in a fiscal year but reported ≤1% of that as total expenses on its
              T3010 (<code className="font-mono text-xs bg-muted px-1 rounded">field_5100</code>). One row per offending fiscal year.
            </div>
          </div>
          <div className="flex gap-3">
            <Repeat className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-foreground">R3 — Funding into loop: </span>
              Entity participates in a circular gifting cycle (cra.loops) AND received non-charity
              (fed/AB) funding.
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── R1 evidence panel ───────────────────────────────────────────────────────
function R1Panel({ evidence, entityId }) {
  const r1 = evidence?.R1;
  if (!r1) return null;
  return (
    <div className="border-l-4 border-amber-400 pl-4 space-y-1.5">
      <div className="flex items-center gap-2 font-semibold text-amber-700 text-sm">
        <AlertTriangle className="w-4 h-4" />
        Inactive after funding
      </div>
      {r1.signals?.includes('ab_status') && (
        <p className="text-sm">
          Alberta legal status: <strong>{r1.ab_status ?? 'non-active'}</strong>
          {r1.ab_non_profit_id && (
            <span className="text-muted-foreground ml-1">(ab_non_profit {String(r1.ab_non_profit_id).slice(0, 8)}…)</span>
          )}
        </p>
      )}
      {r1.signals?.includes('cra_filing_gap') && (
        <p className="text-sm">
          Last T3010 filing: FY <strong>{r1.last_cra_filing_year}</strong>
          {' '}({r1.years_since_last_filing} years ago)
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Last funded: {r1.last_funding_year} · total {fmtCAD(r1.total_funding)}
      </p>
      <Link
        to={`/organizations/${entityId}#funding`}
        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
      >
        View funding history <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── R2 evidence panel ───────────────────────────────────────────────────────
function R2Panel({ evidence, entityId }) {
  const r2 = evidence?.R2;
  if (!r2 || !Array.isArray(r2) || r2.length === 0) return null;
  return (
    <div className="border-l-4 border-orange-400 pl-4 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-orange-700 text-sm">
        <TrendingDown className="w-4 h-4" />
        Funding without financial activity
      </div>
      <div className="space-y-2">
        {r2.map((yr, i) => (
          <div key={i} className="space-y-1">
            <p className="text-sm">
              FY {yr.fiscal_year}: <strong>{fmtCAD(yr.funding_received)}</strong> received,{' '}
              <strong>{fmtCAD(yr.total_expenses_field_5100)}</strong> expensed{' '}
              <span className="text-muted-foreground">(ratio: {fmtPct(yr.ratio)})</span>
            </p>
            {Array.isArray(yr.funding_sources) && yr.funding_sources.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {yr.funding_sources.map((src) => (
                  <span key={src} className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border">
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <Link
        to={`/organizations/${entityId}#financials`}
        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
      >
        View T3010 financials <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── R3 evidence panel ───────────────────────────────────────────────────────
function R3Panel({ evidence }) {
  const r3 = evidence?.R3;
  if (!r3) return null;
  return (
    <div className="border-l-4 border-red-400 pl-4 space-y-1.5">
      <div className="flex items-center gap-2 font-semibold text-red-700 text-sm">
        <Repeat className="w-4 h-4" />
        Funding into circular gifting
      </div>
      {Array.isArray(r3.loop_ids) && (
        <p className="text-sm">
          Loops ({r3.loop_ids.length}): <span className="font-mono text-xs">{r3.loop_ids.join(', ')}</span>
        </p>
      )}
      {(r3.loop_min_year || r3.loop_max_year) && (
        <p className="text-sm">
          Loop years: <strong>{r3.loop_min_year}–{r3.loop_max_year}</strong>
          {r3.loop_total_flow != null && (
            <span> · total flow: <strong>{fmtCAD(r3.loop_total_flow)}</strong></span>
          )}
        </p>
      )}
      {r3.non_charity_funding_received != null && (
        <p className="text-sm">
          Non-charity funding received: <strong>{fmtCAD(r3.non_charity_funding_received)}</strong>
        </p>
      )}
      <Link
        to="/loops"
        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
      >
        View loop participation <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Inline evidence panel (fetched lazily per row) ──────────────────────────
function EvidencePanel({ entityId, firedRules }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ghost-detail', entityId],
    queryFn: () => fetchGhostDetail(entityId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading evidence…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-red-600 py-2">Error loading evidence: {error.message}</p>;
  }

  const evidence = data?.evidence ?? {};

  return (
    <div className="space-y-4 py-3">
      {firedRules.includes('R1') && <R1Panel evidence={evidence} entityId={entityId} />}
      {firedRules.includes('R2') && <R2Panel evidence={evidence} entityId={entityId} />}
      {firedRules.includes('R3') && <R3Panel evidence={evidence} />}
      {Object.keys(evidence).length === 0 && (
        <p className="text-sm text-muted-foreground">No evidence data available.</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GhostOrganizationsPage() {
  // Filters
  const [ruleFilter, setRuleFilter] = useState('all');
  const [sortMode, setSortMode] = useState('rules_count');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);
  // Which row has "Why?" panel open
  const [expandedId, setExpandedId] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setOffset(0); }, [ruleFilter, sortMode, debouncedSearch]);

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['ghosts-stats'],
    queryFn: fetchGhostsStats,
  });

  // List query
  const params = {
    sort: sortMode,
    offset,
    limit,
    ...(ruleFilter !== 'all' ? { rule: ruleFilter } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  };

  const { data: listData, isLoading, isFetching, error } = useQuery({
    queryKey: ['ghosts-list', params],
    queryFn: () => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== '') qs.set(k, String(v));
      }
      return reqEnvelope(`/api/ghosts?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const rows = listData?.data ?? [];
  const meta = listData?.meta ?? null;

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Ghost className="w-3.5 h-3.5" />
          Funding Integrity
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Ghost Organization Analysis</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Recipients flagged by any of three structural-mismatch rules computed against the precomputed pool.
        </p>
      </div>

      {/* ── Stats pills ── */}
      <StatsPills stats={stats} />

      {/* ── How rules work ── */}
      <HowRulesWork />

      {/* ── Filter row + table ── */}
      <Card className="border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Flagged Recipients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 px-5">
            {/* Rule selector — pill buttons */}
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              {['all', 'R1', 'R2', 'R3'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRuleFilter(r)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    ruleFilter === r
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {r === 'all' ? 'All rules' : r}
                </button>
              ))}
            </div>

            {/* Sort */}
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="w-56 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rules_count">Most rules first</SelectItem>
                <SelectItem value="total_funding">Highest funding</SelectItem>
                <SelectItem value="last_funding_year">Most recent funding</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or BN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Organization</TableHead>
                  <TableHead>BN</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead className="text-right">Total Funding</TableHead>
                  <TableHead className="text-right">Last Funded</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {error && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-red-600">
                      {String(error.message ?? error)}
                    </TableCell>
                  </TableRow>
                )}
                {!error && !isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No results match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const isExpanded = expandedId === row.entity_id;
                  return (
                    <React.Fragment key={row.entity_id}>
                      <TableRow className={`hover:bg-muted/30 ${isExpanded ? 'bg-muted/20' : ''}`}>
                        <TableCell>
                          <Link
                            to={`/organizations/${row.entity_id}`}
                            className="font-medium text-sm hover:underline text-primary"
                          >
                            {row.entity_canonical_name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.bn_root ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(row.fired_rules ?? []).map((r) => (
                              <RuleChip key={r} rule={r} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmtCAD(row.total_funding)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.last_funding_year ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleExpand(row.entity_id)}
                          >
                            {isExpanded ? 'Close' : 'Why?'}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Inline evidence panel */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={6} className="px-8 py-3">
                            <EvidencePanel
                              entityId={row.entity_id}
                              firedRules={row.fired_rules ?? []}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <PaginationBar
            meta={meta}
            loading={isFetching}
            onChange={({ offset: o, limit: l }) => { setOffset(o); setLimit(l); }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
