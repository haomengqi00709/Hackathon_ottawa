import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, SlidersHorizontal, X, ArrowUpDown, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import RiskBadge from '@/components/shared/RiskBadge';
import RiskNatureBadge from '@/components/shared/RiskNatureBadge';
import PaginationBar from '@/components/PaginationBar';

// Server-side: name search (q), province (jurisdiction). Backend paginates the
// full 851K-entity universe.
//
// Page-local: risk / ghost / zero-employees filters. They depend on assessment
// data the server doesn't filter by (yet). The "results on this page" badge
// makes the scope explicit so users don't think the page-local filters are
// hiding rows from elsewhere.
const PROVINCES_FALLBACK = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

// Sort modes the orgs endpoint supports. `default` ranks by source_count desc
// (warehouse-side); the score / ghost sorts page through sqlite-precomputed
// assessments to drive ordering across the full 851K pool. score / ghost
// sorts don't combine with q / jurisdiction filters server-side — the FE
// disables those controls when score-sort is active.
const SORT_OPTIONS = [
  { value: 'default',     label: 'Default (most-linked first)' },
  { value: 'score_asc',   label: 'Score (lowest first)' },
  { value: 'score_desc',  label: 'Score (highest first)' },
  { value: 'ghost_desc',  label: 'Ghost flags (most first)' },
];

export default function OrganizationsList() {
  // Server-controlled state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [sortMode, setSortMode] = useState('default');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(100);

  // Page-local filters
  const [riskFilter, setRiskFilter] = useState('all');
  const [riskNatureFilter, setRiskNatureFilter] = useState('all');
  const [ghostMin, setGhostMin] = useState(0);
  const [zeroEmployeesOnly, setZeroEmployeesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();
  const isScoreSort = sortMode !== 'default';

  // Debounce search input — fires the server query 350 ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page when filters change.
  useEffect(() => { setOffset(0); }, [debouncedSearch, provinceFilter, limit, sortMode]);

  const { data: pageData, isLoading, isFetching, error } = useQuery({
    queryKey: ['orgs', 'page', { q: debouncedSearch, jurisdiction: provinceFilter, sort: sortMode, offset, limit }],
    queryFn: () => base44.entities.Organizations.listPage({
      offset,
      limit,
      sort: sortMode,
      // Score sort is purely sqlite-driven; sending q/jurisdiction would be
      // ignored upstream so we omit them to keep the query key clean.
      ...(!isScoreSort && debouncedSearch ? { q: debouncedSearch } : {}),
      ...(!isScoreSort && provinceFilter !== 'all' ? { jurisdiction: provinceFilter } : {}),
    }),
    placeholderData: keepPreviousData,
  });

  const orgs = pageData?.data ?? [];
  const meta = pageData?.meta;

  // The orgs list endpoint inlines the latest precomputed assessment fields
  // on each row (overallCapacityScore, capacityReadinessScore,
  // integrityConcernScore, riskLevel, riskNature, ghostScore, ghostFlags).
  // No separate /api/assessments fetch needed — the previous approach loaded
  // a 100-row sample globally and looked up by org.id, which never matched
  // for any entity outside that small slice.

  const provinces = PROVINCES_FALLBACK;

  const activeFiltersCount = [
    riskFilter !== 'all',
    riskNatureFilter !== 'all',
    ghostMin > 0,
    zeroEmployeesOnly,
  ].filter(Boolean).length;

  // Page-local refinement: filters that depend on the inlined assessment
  // fields. The total/page-count comes from the server.
  const filtered = useMemo(() => {
    const rows = orgs.filter(o => {
      if (zeroEmployeesOnly && (o.employeeCount ?? 1) !== 0) return false;
      const hasAssessment = o.riskLevel != null;
      if (riskFilter !== 'all') {
        if (!hasAssessment) return riskFilter === 'unassessed';
        if (o.riskLevel !== riskFilter) return false;
      }
      if (riskNatureFilter !== 'all') {
        if (!hasAssessment || o.riskNature !== riskNatureFilter) return false;
      }
      if (ghostMin > 0) {
        if ((o.ghostScore ?? 0) < ghostMin) return false;
      }
      return true;
    });
    return rows;
  }, [orgs, riskFilter, riskNatureFilter, ghostMin, zeroEmployeesOnly]);

  const clearFilters = () => {
    setRiskFilter('all');
    setRiskNatureFilter('all');
    setGhostMin(0);
    setZeroEmployeesOnly(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : meta
                ? `Showing ${filtered.length.toLocaleString()} on this page · ${meta.total.toLocaleString()} total entities`
                : '—'}
          </p>
        </div>
        <Link to="/organizations/new">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Add Organization</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search + quick controls row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={
                  isScoreSort
                    ? 'Name search disabled while sorting by score'
                    : 'Search by name (server-side; case-insensitive)…'
                }
                value={search}
                onChange={e => setSearch(e.target.value)}
                disabled={isScoreSort}
                className="pl-9"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            <Select value={provinceFilter} onValueChange={setProvinceFilter} disabled={isScoreSort}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Provinces</SelectItem>
                {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="w-56" title="Score / ghost sorts page through the precomputed pool — they don't combine with name or jurisdiction filters.">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button
              variant={showFilters ? 'default' : 'outline'}
              className="gap-2 relative"
              onClick={() => setShowFilters(v => !v)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Page filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {isScoreSort && (
            <p className="text-[11px] text-muted-foreground italic px-1">
              Sorting by score across all 851K precomputed assessments. Name and province filters are disabled in this mode — switch back to <em>Default</em> to use them.
            </p>
          )}

          {/* Page-local filter panel */}
          {showFilters && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <p className="text-[11px] text-muted-foreground italic">
                These filters apply to the current page only — they refine the
                rows the server has already returned. To filter across all
                851K entities, use the search/jurisdiction controls above
                (those are server-side).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Level</Label>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Levels" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="unassessed">Not Assessed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Nature</Label>
                  <Select value={riskNatureFilter} onValueChange={setRiskNatureFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                      <SelectItem value="Emerging but Underdeveloped">Emerging but Underdeveloped</SelectItem>
                      <SelectItem value="Overstretched / Request Exceeds Capacity">Overstretched</SelectItem>
                      <SelectItem value="High Concern / Enhanced Due Diligence Required">High Concern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff Filter</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch id="zero-emp" checked={zeroEmployeesOnly} onCheckedChange={setZeroEmployeesOnly} />
                    <label htmlFor="zero-emp" className="text-sm cursor-pointer">Zero employees only</label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Min Ghost Score: <strong>{ghostMin === 0 ? 'Any' : `≥ ${ghostMin}/10`}</strong>
                  </Label>
                  <Slider min={0} max={10} step={1} value={[ghostMin]} onValueChange={([v]) => setGhostMin(v)} />
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearFilters}>
                    <X className="w-3.5 h-3.5" /> Clear page filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Organization</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Ghost</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="hidden lg:table-cell">Nature</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-red-600">
                      {String(error.message ?? error)}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(org => {
                  const ghost = org.ghostScore;
                  const score = org.overallCapacityScore;
                  return (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/organizations/${org.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-snug">{org.organizationName}</p>
                            <p className="text-xs text-muted-foreground">{org.registrationNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{org.jurisdiction ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {org.employeeCount == null
                          ? <span className="text-muted-foreground">—</span>
                          : Number(org.employeeCount) === 0
                            ? <span className="text-red-600 font-semibold">0</span>
                            : Number(org.employeeCount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {ghost != null ? (
                          <span className={`font-bold tabular-nums text-sm ${ghost >= 8 ? 'text-red-600' : ghost >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                            {ghost}/10
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {org.riskLevel ? <RiskBadge level={org.riskLevel} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {org.riskNature
                          ? <RiskNatureBadge riskNature={org.riskNature} />
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {score != null ? (
                          <span className={`font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {score}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!error && filtered.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {orgs.length === 0
                        ? 'No organizations match the search'
                        : 'No rows on this page match the page filters — clear filters or page through more results'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
