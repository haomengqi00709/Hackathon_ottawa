import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import RiskBadge from '@/components/shared/RiskBadge';
import RiskNatureBadge from '@/components/shared/RiskNatureBadge';
import { Badge } from '@/components/ui/badge';

export default function OrganizationsList() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const navigate = useNavigate();

  const { data: orgs = [], isLoading } = useQuery({ queryKey: ['orgs'], queryFn: () => base44.entities.Organizations.list() });
  const { data: assessments = [] } = useQuery({ queryKey: ['assessments'], queryFn: () => base44.entities.CapacityAssessments.list() });

  const latestAssessments = {};
  assessments.forEach(a => {
    if (!latestAssessments[a.organizationId] || new Date(a.assessmentDate) > new Date(latestAssessments[a.organizationId].assessmentDate)) {
      latestAssessments[a.organizationId] = a;
    }
  });

  const filtered = orgs.filter(o => {
    if (search && !o.organizationName.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && o.organizationType !== typeFilter) return false;
    if (riskFilter !== 'all') {
      const a = latestAssessments[o.id];
      if (!a) return riskFilter === 'unassessed';
      if (a.riskLevel !== riskFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">{orgs.length} organizations in database</p>
        </div>
        <Link to="/organizations/new">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Add Organization</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="charity">Charity</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="cooperative">Cooperative</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Concern</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High Concern</SelectItem>
                <SelectItem value="unassessed">Not Assessed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="hidden lg:table-cell">Nature</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(org => {
                  const assessment = latestAssessments[org.id];
                  return (
                    <TableRow key={org.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/organizations/${org.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{org.organizationName}</p>
                            <p className="text-xs text-muted-foreground">{org.registrationNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{org.organizationType}</Badge></TableCell>
                      <TableCell className="text-sm">{org.jurisdiction}</TableCell>
                      <TableCell className="text-sm">{org.employeeCount ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${org.activeStatus === 'active' ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}>
                          {org.activeStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{assessment ? <RiskBadge level={assessment.riskLevel} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="hidden lg:table-cell">{assessment?.riskNature ? <RiskNatureBadge riskNature={assessment.riskNature} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
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
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No organizations found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}