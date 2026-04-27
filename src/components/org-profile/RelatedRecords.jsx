import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBase } from '@/api/httpClient';
import { ChevronDown, ChevronRight, Loader2, Database, Users, Banknote, Repeat, FileText, AlertTriangle, Building, Receipt, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const fmt = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }).format(Number(n));
const fmtN = (n) => (n == null ? '—' : new Intl.NumberFormat('en-CA').format(Number(n)));

async function fetchDossier(id) {
  const r = await fetch(`${apiBase()}/api/orgs/${encodeURIComponent(id)}/dossier`);
  if (!r.ok) throw new Error(`${r.status}`);
  const j = await r.json();
  return j.data;
}

function Section({ icon: Icon, title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const empty = !count;
  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/40 transition-colors ${
          empty ? 'text-muted-foreground' : ''
        }`}
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Icon className="w-4 h-4" />
        <span className="flex-1 text-left">{title}</span>
        <Badge variant={empty ? 'outline' : 'secondary'} className="text-[10px]">
          {empty ? 'no data' : `${count} rows`}
        </Badge>
      </button>
      {open && !empty && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

function MiniTable({ rows, columns, max = 10 }) {
  const slice = rows.slice(0, max);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c.key} className={`px-2 py-1 text-left text-[10px] uppercase tracking-wider text-muted-foreground ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slice.map((r, i) => (
            <tr key={i} className="border-b border-border/40">
              {columns.map((c) => (
                <td key={c.key} className={`px-2 py-1 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > max && (
        <p className="text-[10px] text-muted-foreground italic mt-1">
          showing {max} of {rows.length}
        </p>
      )}
    </div>
  );
}

export default function RelatedRecords({ orgId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dossier', orgId],
    queryFn: () => fetchDossier(orgId),
    enabled: Boolean(orgId),
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading related records…
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-card border border-red-200 rounded-xl p-4 text-sm text-red-600">
        Failed to load dossier: {String(error.message ?? error)}
      </div>
    );
  }
  if (!data) return null;

  const { entity, bnRoots, abOnly, abNonProfit, cra, loops, funding, publicContracts, userAdded, adverseMedia } = data;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Related Records</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every row across CRA / fed grants / AB grants / AB contracts / AB sole-source / AB nonprofit registry / public procurement that resolves to this entity, gathered via{' '}
            <code>general.entity_source_links</code>{' '}
            (exact-name, normalized, trade-name, bn-anchor) plus bn_root lookup for CRA detail tables and fuzzy-match for federal contracts.
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end flex-shrink-0">
          {abOnly && <Badge variant="outline" className="text-[10px]">AB-only entity</Badge>}
          {bnRoots?.length > 0 && (
            <Badge variant="secondary" className="text-[10px] font-mono">
              BN root: {bnRoots.join(', ')}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {/* Funding flows ─────────────────────────────────────────────── */}
        <Section icon={Banknote} title="Federal grants & contributions" count={funding?.fed?.length}>
          <MiniTable
            rows={funding?.fed ?? []}
            columns={[
              { key: 'agreement_start_date', label: 'Date' },
              { key: 'prog_name_en', label: 'Program' },
              { key: 'owner_org_title', label: 'Department' },
              { key: 'agreement_value', label: 'Amount', align: 'right', render: (r) => fmt(r.agreement_value) },
            ]}
          />
        </Section>

        <Section icon={Banknote} title="Alberta grants" count={funding?.abGrants?.length}>
          <MiniTable
            rows={funding?.abGrants ?? []}
            columns={[
              { key: 'payment_date', label: 'Date' },
              { key: 'program', label: 'Program' },
              { key: 'ministry', label: 'Ministry' },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => fmt(r.amount) },
            ]}
          />
        </Section>

        <Section icon={Receipt} title="Alberta contracts" count={funding?.abContracts?.length}>
          <MiniTable
            rows={funding?.abContracts ?? []}
            columns={[
              { key: 'ministry', label: 'Ministry' },
              { key: 'recipient', label: 'Recipient' },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => fmt(r.amount) },
            ]}
          />
        </Section>

        <Section icon={Receipt} title="Alberta sole-source" count={funding?.abSoleSource?.length}>
          <MiniTable
            rows={funding?.abSoleSource ?? []}
            columns={[
              { key: 'start_date', label: 'Start' },
              { key: 'ministry', label: 'Ministry' },
              { key: 'contract_services', label: 'Services' },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => fmt(r.amount) },
            ]}
          />
        </Section>

        <Section icon={Receipt} title="Federal contracts (fuzzy name match)" count={publicContracts?.length}>
          <MiniTable
            rows={publicContracts ?? []}
            columns={[
              { key: 'contract_date', label: 'Date' },
              { key: 'vendor_name', label: 'Vendor (raw)' },
              { key: 'owner_org_title', label: 'Department' },
              { key: 'contract_value', label: 'Value', align: 'right', render: (r) => fmt(r.contract_value) },
            ]}
          />
          <p className="text-[10px] text-muted-foreground italic mt-2">
            Note: matched by trigram similarity on vendor_name (≥ 0.85). Run <code>npm run backfill:contracts</code> on the backend to replace this with the resolved entity_id crosswalk.
          </p>
        </Section>

        {/* CRA detail ─────────────────────────────────────────────────── */}
        <Section icon={FileText} title="CRA financials by year" count={cra?.financials?.length}>
          <MiniTable
            rows={cra?.financials ?? []}
            columns={[
              { key: 'fiscal_year', label: 'FY' },
              { key: 'total_revenue', label: 'Revenue', align: 'right', render: (r) => fmt(r.total_revenue) },
              { key: 'fed_govt', label: 'Federal $', align: 'right', render: (r) => fmt(r.federal_government_revenue) },
              { key: 'prov_govt', label: 'Provincial $', align: 'right', render: (r) => fmt(r.provincial_government_revenue) },
              { key: 'total_expenditures', label: 'Expenses', align: 'right', render: (r) => fmt(r.total_expenditures) },
              { key: 'programs', label: 'Programs $', align: 'right', render: (r) => fmt(r.charitable_programs_expenditure) },
            ]}
          />
        </Section>

        <Section icon={Users} title="CRA directors (latest fiscal period)" count={cra?.directors?.length}>
          <MiniTable
            rows={cra?.directors ?? []}
            columns={[
              { key: 'last_name', label: 'Last' },
              { key: 'first_name', label: 'First' },
              { key: 'position', label: 'Position' },
              { key: 'at_arms_length', label: 'Arms-length', render: (r) => (r.at_arms_length ? 'yes' : 'no') },
              { key: 'start_date', label: 'Since' },
            ]}
            max={20}
          />
        </Section>

        <Section icon={Users} title="CRA compensation (latest)" count={cra?.compensation?.length}>
          <MiniTable
            rows={cra?.compensation ?? []}
            columns={[
              { key: 'fpe', label: 'Period' },
              { key: 'positions', label: 'Positions', align: 'right', render: (r) => fmtN(r.field_370) },
              { key: 'total_comp', label: 'Total comp', align: 'right', render: (r) => fmt(r.field_390) },
              { key: 'top10_paid', label: 'Top-10 paid', align: 'right', render: (r) => fmt(r.field_380) },
            ]}
          />
        </Section>

        <Section icon={FileText} title="CRA charitable programs" count={cra?.programs?.length}>
          <MiniTable
            rows={cra?.programs ?? []}
            columns={[
              { key: 'program_type', label: 'Type' },
              { key: 'description', label: 'Description', render: (r) => <span className="line-clamp-2">{r.description ?? ''}</span> },
            ]}
            max={5}
          />
        </Section>

        <Section icon={AlertTriangle} title="CRA T3010 plausibility / impossibility flags" count={cra?.t3010Flags?.length}>
          <MiniTable
            rows={cra?.t3010Flags ?? []}
            columns={[
              { key: 'family', label: 'Type' },
              { key: 'fiscal_year', label: 'FY' },
              { key: 'rule_code', label: 'Rule' },
              { key: 'severity', label: 'Severity', align: 'right', render: (r) => fmtN(r.severity) },
              { key: 'details', label: 'Details', render: (r) => <span className="line-clamp-2 text-[10px]">{r.details}</span> },
            ]}
            max={10}
          />
        </Section>

        <Section icon={Gift} title="Gifts to qualified donees (out)" count={cra?.giftsGiven?.length}>
          <MiniTable
            rows={cra?.giftsGiven ?? []}
            columns={[
              { key: 'fpe', label: 'Period' },
              { key: 'donee_name', label: 'Recipient' },
              { key: 'donee_bn', label: 'Donee BN' },
              { key: 'total_gifts', label: 'Amount', align: 'right', render: (r) => fmt(r.total_gifts) },
            ]}
          />
        </Section>

        <Section icon={Gift} title="Gifts received from other charities" count={cra?.giftsReceived?.length}>
          <MiniTable
            rows={cra?.giftsReceived ?? []}
            columns={[
              { key: 'fpe', label: 'Period' },
              { key: 'giver_legal_name', label: 'From' },
              { key: 'giver_bn', label: 'Giver BN' },
              { key: 'total_gifts', label: 'Amount', align: 'right', render: (r) => fmt(r.total_gifts) },
            ]}
          />
        </Section>

        {/* Money-flow graph ─────────────────────────────────────────── */}
        <Section icon={Repeat} title="Loop participation" count={loops?.loops?.length}>
          <MiniTable
            rows={loops?.loops ?? []}
            columns={[
              { key: 'hops', label: 'Hops', align: 'right' },
              { key: 'same_year', label: 'Same FY', render: (r) => (r.same_year ? '⚠ yes' : 'no') },
              { key: 'min_year', label: 'From' },
              { key: 'max_year', label: 'To' },
              { key: 'bottleneck_amt', label: 'Bottleneck', align: 'right', render: (r) => fmt(r.bottleneck_amt) },
              { key: 'path_display', label: 'Path', render: (r) => <span className="font-mono text-[10px] line-clamp-1">{r.path_display}</span> },
            ]}
            max={10}
          />
        </Section>

        {/* AB registry ──────────────────────────────────────────────── */}
        <Section icon={Building} title="Alberta non-profit registry" count={abNonProfit ? 1 : 0}>
          {abNonProfit && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Stat label="Status" value={abNonProfit.status} />
              <Stat label="Type" value={abNonProfit.type} />
              <Stat label="Registered" value={abNonProfit.registration_date} />
              <Stat label="City" value={abNonProfit.city} />
              <Stat label="Postal" value={abNonProfit.postal_code} />
              <Stat label="Legal name" value={abNonProfit.legal_name} />
            </div>
          )}
        </Section>

        {/* Adverse media + user data ─────────────────────────────────── */}
        <Section icon={AlertTriangle} title="Adverse media events" count={adverseMedia?.length}>
          <MiniTable
            rows={adverseMedia ?? []}
            columns={[
              { key: 'event_date', label: 'Date' },
              { key: 'event_type', label: 'Type' },
              { key: 'severity', label: 'Severity', align: 'right' },
              { key: 'source', label: 'Source' },
            ]}
          />
        </Section>

        <Section icon={Database} title="User-added records" count={(userAdded?.assessments?.length || 0) + (userAdded?.financials?.length || 0) + (userAdded?.funding?.length || 0)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label="Assessments" value={userAdded?.assessments?.length ?? 0} />
            <Stat label="Decisions" value={userAdded?.decisions?.length ?? 0} />
            <Stat label="Financial rows" value={userAdded?.financials?.length ?? 0} />
            <Stat label="Funding rows" value={userAdded?.funding?.length ?? 0} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-muted/40 rounded p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold leading-tight">{value || '—'}</p>
    </div>
  );
}
