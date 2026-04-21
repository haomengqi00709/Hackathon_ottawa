import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Sliders } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function BenchmarksPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({
    benchmarkCategory: '', minimumExpectedEmployees: '', minimumInfrastructureLevel: 'light',
    expectedProgramExpenseRatio: '', maxGovernmentDependencyRatio: '', notes: ''
  });

  const { data: benchmarks = [] } = useQuery({ queryKey: ['benchmarks'], queryFn: () => base44.entities.Benchmarks.list() });

  const save = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        minimumExpectedEmployees: Number(form.minimumExpectedEmployees) || 0,
        expectedProgramExpenseRatio: Number(form.expectedProgramExpenseRatio) || 0,
        maxGovernmentDependencyRatio: Number(form.maxGovernmentDependencyRatio) || 0,
      };
      if (dialog === 'new') await base44.entities.Benchmarks.create(data);
      else await base44.entities.Benchmarks.update(dialog, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['benchmarks'] }); setDialog(null); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Benchmarks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['benchmarks'] }),
  });

  const openEdit = (b) => {
    setForm({
      benchmarkCategory: b.benchmarkCategory, minimumExpectedEmployees: b.minimumExpectedEmployees || '',
      minimumInfrastructureLevel: b.minimumInfrastructureLevel || 'light',
      expectedProgramExpenseRatio: b.expectedProgramExpenseRatio || '',
      maxGovernmentDependencyRatio: b.maxGovernmentDependencyRatio || '', notes: b.notes || ''
    });
    setDialog(b.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benchmarks</h1>
          <p className="text-sm text-muted-foreground">Configure capacity benchmarks by organization category</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm({ benchmarkCategory: '', minimumExpectedEmployees: '', minimumInfrastructureLevel: 'light', expectedProgramExpenseRatio: '', maxGovernmentDependencyRatio: '', notes: '' }); setDialog('new'); }}>
          <Plus className="w-4 h-4" /> Add Benchmark
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Category</TableHead>
                <TableHead>Min. Employees</TableHead>
                <TableHead>Infrastructure</TableHead>
                <TableHead>Program Expense</TableHead>
                <TableHead>Max Govt Dependency</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.benchmarkCategory}</TableCell>
                  <TableCell>{b.minimumExpectedEmployees}</TableCell>
                  <TableCell className="capitalize">{b.minimumInfrastructureLevel}</TableCell>
                  <TableCell>{b.expectedProgramExpenseRatio ? `${Math.round(b.expectedProgramExpenseRatio * 100)}%` : '—'}</TableCell>
                  <TableCell>{b.maxGovernmentDependencyRatio ? `${Math.round(b.maxGovernmentDependencyRatio * 100)}%` : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(b.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {benchmarks.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No benchmarks defined</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === 'new' ? 'Add' : 'Edit'} Benchmark</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category Name *</Label><Input value={form.benchmarkCategory} onChange={e => setForm(p => ({ ...p, benchmarkCategory: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min. Employees</Label><Input type="number" value={form.minimumExpectedEmployees} onChange={e => setForm(p => ({ ...p, minimumExpectedEmployees: e.target.value }))} /></div>
              <div><Label>Infrastructure Level</Label>
                <Select value={form.minimumInfrastructureLevel} onValueChange={v => setForm(p => ({ ...p, minimumInfrastructureLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="significant">Significant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Expected Program Expense Ratio</Label><Input type="number" step="0.01" min="0" max="1" value={form.expectedProgramExpenseRatio} onChange={e => setForm(p => ({ ...p, expectedProgramExpenseRatio: e.target.value }))} placeholder="e.g. 0.65" /></div>
              <div><Label>Max Govt Dependency Ratio</Label><Input type="number" step="0.01" min="0" max="1" value={form.maxGovernmentDependencyRatio} onChange={e => setForm(p => ({ ...p, maxGovernmentDependencyRatio: e.target.value }))} placeholder="e.g. 0.80" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button disabled={!form.benchmarkCategory || save.isPending} onClick={() => save.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}