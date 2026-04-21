import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OrganizationNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    organizationName: '', organizationType: 'nonprofit', registrationNumber: '',
    jurisdiction: '', activeStatus: 'active', website: '',
    physicalPresenceStatus: 'unknown', address: '', employeeCount: '',
    volunteerCount: '', yearFounded: '', missionDescription: '', notes: ''
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Organizations.create(data),
    onSuccess: (newOrg) => { qc.invalidateQueries({ queryKey: ['orgs'] }); navigate(`/organizations/${newOrg.id}`); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.employeeCount) data.employeeCount = Number(data.employeeCount);
    if (data.volunteerCount) data.volunteerCount = Number(data.volunteerCount);
    if (data.yearFounded) data.yearFounded = Number(data.yearFounded);
    mutation.mutate(data);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/organizations"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Add Organization</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">Organization Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Organization Name *</Label><Input required value={form.organizationName} onChange={e => update('organizationName', e.target.value)} /></div>
            <div><Label>Type *</Label>
              <Select value={form.organizationType} onValueChange={v => update('organizationType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nonprofit">Nonprofit</SelectItem>
                  <SelectItem value="charity">Charity</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="cooperative">Cooperative</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Registration Number</Label><Input value={form.registrationNumber} onChange={e => update('registrationNumber', e.target.value)} /></div>
            <div><Label>Jurisdiction</Label><Input value={form.jurisdiction} onChange={e => update('jurisdiction', e.target.value)} /></div>
            <div><Label>Active Status</Label>
              <Select value={form.activeStatus} onValueChange={v => update('activeStatus', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dissolved">Dissolved</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Website</Label><Input value={form.website} onChange={e => update('website', e.target.value)} /></div>
            <div><Label>Physical Presence</Label>
              <Select value={form.physicalPresenceStatus} onValueChange={v => update('physicalPresenceStatus', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => update('address', e.target.value)} /></div>
            <div><Label>Employees</Label><Input type="number" value={form.employeeCount} onChange={e => update('employeeCount', e.target.value)} /></div>
            <div><Label>Volunteers</Label><Input type="number" value={form.volunteerCount} onChange={e => update('volunteerCount', e.target.value)} /></div>
            <div><Label>Year Founded</Label><Input type="number" value={form.yearFounded} onChange={e => update('yearFounded', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Mission Description</Label><Textarea value={form.missionDescription} onChange={e => update('missionDescription', e.target.value)} rows={3} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} /></div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <Link to="/organizations"><Button variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={mutation.isPending} className="gap-2"><Save className="w-4 h-4" /> Save Organization</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}