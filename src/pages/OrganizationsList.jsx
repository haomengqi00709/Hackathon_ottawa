import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import RiskBadge from '@/components/shared/RiskBadge';
import RiskNatureBadge from '@/components/shared/RiskNatureBadge';

const SORT_OPTIONS = [
  { value: 'ghost_desc',    label: 'Ghost Score ↓' },
  { value: 'ghost_asc',     label: 'Ghost Score ↑' },
  { value: 'score_asc',     label: 'Capacity Score ↑' },
  { value: 'score_desc',    label: 'Capacity Score ↓' },
  { value: 'name_asc',      label: 'Name A→Z' },
];

export default function OrganizationsList() {
  const [search, setSearch]               = useState('');
  const [riskFilter, setRiskFilter]       = useState('all');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [riskNatureFilter, setRiskNatureFilter] = useState('all');
  const [ghostMin, setGhostMin]           = useState(0);
  const [zeroEmployeesOnly, setZeroEmployeesOnly] = useState(false);
  const [sortBy, setSortBy]               = useState('ghost_desc');
  const [showFilters, setShowFilters]     = useState(false);
  const navigate = useNavigate();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => base44.entities.Organizations.list(),
  });
  const { data: assessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => base44.entities.CapacityAssessments.list(),
  });

  const latestAssessments = useMemo(() => {
    const map = {};
    assessments.forEach(a => {
      if (!map[a.organizationId] || new Date(a.assessmentDate) > new Date(map[a.organizationId].assessmentDate)) {
        map[a.organizationId] = a;
      }
    });
    return map;
  }, [assessments]);

  const provinces = useMemo(() => {
    const set = new Set(orgs.map(o => o.jurisdiction).filter(Boolean));
    return Array.from(set).sort();
  }, [orgs]);

  const activeFiltersCount = [
    riskFilter !== 'all',
    provinceFilter !== 'all',
    riskNatureFilter !== 'all',
    ghostMin > 0,
    zeroEmployeesOnly,
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let rows = orgs.filter(o => {
      if (search && !o.organizationName?.toLowerCase().includes(search.toLowerCase())) return false;
      if (provinceFilter !== 'all' && o.jurisdiction !== provinceFilter) return false;
      if (zeroEmployeesOnly && (o.employeeCount ?? 1) !== 0) return false;

      const a = latestAssessments[o.id];
      if (riskFilter !== 'all') {
        if (!a) return riskFilter === 'unassessed';
        if (a.riskLevel !== riskFilter) return false;
      }
      if (riskNatureFilter !== 'all') {
        if (!a || a.riskNature !== riskNatureFilter) return false;
      }
      if (ghostMin > 0) {
        if (!a || (a.ghostScore ?? 0) < ghostMin) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      const aa = latestAssessments[a.id];
      const ba = latestAssessments[b.id];
      if (sortBy === 'ghost_desc') return (ba?.ghostScore ?? 0) - (aa?.ghostScore ?? 0);
      if (sortBy === 'ghost_asc')  return (aa?.ghostScore ?? 0) - (ba?.ghostScore ?? 0);
      if (sortBy === 'score_asc')  return (aa?.overallCapacityScore ?? 0) - (ba?.overallCapacityScore ?? 0);
      if (sortBy === 'score_desc') return (ba?.overallCapacityScore ?? 0) - (aa?.overallCapacityScore ?? 0);
      if (sortBy === 'name_asc')   return a.organizationName?.localeCompare(b.organizationName);
      return 0;
    });

    return rows;
  }, [orgs, latestAssessments, search, provinceFilter, riskFilter, riskNatureFilter, ghostMin, zeroEmployeesOnly, sortBy]);

  const clearFilters = () => {
    setRiskFilter('all');
    setProvinceFilter('all');
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
            {isLoading ? 'Loading…' : `${filtered.length} of ${orgs.length} organizations`}
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
                placeholder="Search by name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
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
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Province */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Province</Label>
                  <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All Provinces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Provinces</SelectItem>
                      {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Risk Level */}
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

                {/* Risk Nature */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Nature</Label>
                  <Select value={riskNatureFilter} onValueChange={setRiskNatureFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="High Concern">High Concern</SelectItem>
                      <SelectItem value="Overstretched">Overstretched</SelectItem>
                      <SelectItem value="Underdeveloped">Underdeveloped</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Zero employees toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff Filter</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      id="zero-emp"
                      checked={zeroEmployeesOnly}
                      onCheckedChange={setZeroEmployeesOnly}
                    />
                    <label htmlFor="zero-emp" className="text-sm cursor-pointer">
                      Zero employees only
                    </label>
                  </div>
                </div>
              </div>

              {/* Ghost Score slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Minimum Ghost Score
                  </Label>
                  <span className="text-sm font-bold tabular-nums">
                    {ghostMin === 0 ? 'Any' : `≥ ${ghostMin}/10`}
                  </span>
                </div>
                <Slider
                  min={0} max={10} step={1}
                  value={[ghostMin]}
                  onValueChange={([v]) => setGhostMin(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 — Any</span>
                  <span>5 — Borderline</span>
                  <span>8 — Severe</span>
                  <span>10 — Confirmed</span>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearFilters}>
                    <X className="w-3.5 h-3.5" /> Clear all filters
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
                {filtered.map(org => {
                  const assessment = latestAssessments[org.id];
                  const ghost = assessment?.ghostScore ?? null;
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
                        {org.employeeCount === 0
                          ? <span className="text-red-600 font-semibold">0</span>
                          : (org.employeeCount ?? '—')}
                      </TableCell>
                      <TableCell>
                        {ghost !== null ? (
                          <span className={`font-bold tabular-nums text-sm ${ghost >= 8 ? 'text-red-600' : ghost >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                            {ghost}/10
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {assessment ? <RiskBadge level={assessment.riskLevel} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {assessment?.riskNature
                          ? <RiskNatureBadge riskNature={assessment.riskNature} />
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {assessment ? (
                          <span className={`font-bold ${assessment.overallCapacityScore >= 70 ? 'text-green-600' : assessment.overallCapacityScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {assessment.overallCapacityScore}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No organizations match the current filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
