import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Scale, Users, Shield, Heart, Ruler, TrendingUp,
  Sparkles, Bot, AlertTriangle, Repeat,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchGhostsStats } from '@/api/httpClient';

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmtPct = (v) => `${v}%`;

// ─── Static data ─────────────────────────────────────────────────────────────
const CONCENTRATION_PERCENTILE = [
  { label: 'Top 1%\n(≥$7.4M)', pct: 92.98 },
  { label: 'Top 10%\n(≥$198K)', pct: 98.96 },
  { label: 'Top 50%\n(≥$5K)', pct: 99.93 },
  { label: 'Bottom 50%\n(<$5K)', pct: 0.07 },
];

const COHORT_POPULATION = [
  { cohort: 'tiny\n(no T3010)', pctPop: 90.4, pctDollars: 84.7 },
  { cohort: 'small\n(≤5 emp)', pctPop: 5.6, pctDollars: 0.4 },
  { cohort: 'mid', pctPop: 3.3, pctDollars: 1.9 },
  { cohort: 'large', pctPop: 0.7, pctDollars: 13.0 },
];

const GHOST_FLAG_RATE = [
  { cohort: 'tiny', rate: 4.6 },
  { cohort: 'small', rate: 5.1 },
  { cohort: 'mid', rate: 31.3 },
  { cohort: 'large', rate: 55.2 },
];

const LOOP_RATE = [
  { cohort: 'tiny', rate: 0.00013 },
  { cohort: 'small', rate: 0.086 },
  { cohort: 'mid', rate: 1.10 },
  { cohort: 'large', rate: 4.81 },
];

const EXAMPLE_ENTITIES = [
  {
    name: 'The Student Radio Society of UBC',
    bn: '119460632',
    funding: '$50,035',
    year: 'FY2018',
    rule: 'R2',
    reason: 'Student club — T3010 filing not required. Flagged because $0 T3010 expenses against $50K grant.',
  },
  {
    name: "Mi'kmaq Alsumk Mowimsikik",
    bn: '100005530',
    funding: '$50,050',
    year: 'FY2020',
    rule: 'R2',
    reason: 'Indigenous community group. Community-trust model; T3010 filing not applicable.',
  },
  {
    name: 'Placentia Area Harbour Authority',
    bn: '893126565',
    funding: '$50,032',
    year: 'FY2020',
    rule: 'R2',
    reason: 'Small port authority — government-owned entity with an off-cycle fiscal year.',
  },
  {
    name: 'Powassan & District Union Public Library',
    bn: '107854614',
    funding: '$50,142',
    year: '2024',
    rule: 'R1',
    reason: 'Small public library. Biennial filing schedule or admin lag; 2-year gap threshold is too tight.',
  },
  {
    name: 'Burstall Swimming Pool Association',
    bn: '118822006',
    funding: '$50,028',
    year: '2024',
    rule: 'R1',
    reason: 'Volunteer-run community pool. Filing depends on a single volunteer treasurer.',
  },
  {
    name: 'Edmonton Chinese Baptist Church',
    bn: '118893544',
    funding: '$50,043',
    year: '2024',
    rule: 'R1',
    reason: 'Small congregation with limited admin staff. 2-year gap firing too aggressively.',
  },
];

const ADVOCACY_CARDS = [
  {
    num: '1',
    icon: Users,
    headline: "They're 96% of recipients but get less than 1% of dollars",
    data: 'Bottom 800,000 entities split <1% of all government funding.',
    interpretation:
      'Even if every one was fraudulent, the absolute dollar exposure is a rounding error against the $855B at the top.',
    accentColor: 'text-amber-500',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    num: '2',
    icon: Shield,
    headline: "They're structurally less corruptible",
    data: 'Loop participation: tiny 0.0001%, small 0.09%, mid 1.10%, large 4.81%.',
    interpretation:
      'Multi-charity gifting requires shared directors, gift authority, coordination — small orgs lack all three.',
    accentColor: 'text-blue-500',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    num: '3',
    icon: Heart,
    headline: "They're penalized for being lean, not concerning",
    data: 'A 2-person consultancy delivering $400K programming scores 75 on staffingScore. A small org with $35K admin on $80K revenue gets dinged on programExpenseScore.',
    interpretation:
      'The engine measures scale, not effectiveness. Lean is not the same as weak.',
    accentColor: 'text-rose-500',
    borderColor: 'border-rose-200 dark:border-rose-800',
  },
  {
    num: '4',
    icon: Ruler,
    headline: "The scoring dimensions don't measure what matters",
    data: 'No measurement of community impact, mission alignment, beneficiary outcomes, or per-dollar leverage.',
    interpretation:
      'The engine measures operational scale. Small orgs lack scale by definition — calling that "low capacity" inverts the framing.',
    accentColor: 'text-purple-500',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  {
    num: '5',
    icon: TrendingUp,
    headline: "The system's attention budget is upside down",
    data: '35,262 R2 false positives + 12,500 R1 flags consume reviewer time on $50K grants. $855B at the top 1,102 recipients generates ~zero engine flags.',
    interpretation:
      'A risk-proportionate engine would scrutinize concentration first and fragmentation second.',
    accentColor: 'text-emerald-500',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
];

const AGENTIC_CARDS = [
  {
    title: 'False-Positive Triage Agent',
    problem: '35K R2 false positives crowding the human reviewer queue.',
    role: 'For each ghost-flagged entity, auto-fetch the entity\'s website, news mentions, and social media. Summarize "what this org actually does" and recommend dismiss / keep / escalate. Reviewer reads the brief in 10 seconds vs. 5 minutes per entity.',
    example: `Entity 'Mi'kmaq Alsumk Mowimsikik' (BN 100005530) was flagged R2 for receiving $50K with $0 reported T3010 expenses. Search public sources, summarize the org's stated mission and operational status, and recommend whether the flag should escalate to manual review or auto-dismiss.`,
  },
  {
    title: 'Outcome Enrichment Agent',
    problem: 'The engine measures scale, not impact. Outcome data is absent entirely.',
    role: 'Pull annual reports, news mentions, and beneficiary testimonials. Synthesize a per-entity "impact narrative" the dashboard displays alongside scoring numbers.',
    example: 'Reviewer sees both a 56/100 capacity score AND: "This org provides reading programs to 200 children annually in a rural community with no other library access."',
  },
  {
    title: 'Concentration-Side Scrutiny Agent',
    problem: '$855B flows to 1,102 entities the rule-based engine cannot evaluate.',
    role: 'For each top-decile recipient, scrape contracts metadata, executive compensation, and related-party disclosures. Flag patterns the rules engine misses: single procurement officer awarding repeat contracts, executive overlap with grant-receiving entities.',
    example: 'Flag: "5 consecutive sole-source contracts totalling $22M awarded by the same procurement officer to an entity sharing 2 directors with a subsidiary of the recipient."',
  },
  {
    title: 'Compliance Assistant for Small Orgs',
    problem: 'Small orgs miss T3010 filings and get auto-flagged. Lean operations cannot afford full-time admin.',
    role: 'Free assistant small orgs can install. Monitors filing deadlines, drafts T3010 forms from accounting data, flags upcoming compliance requirements. Lowers the cost of being legible to the system — which directly reduces false-positive flagging.',
    example: '"Your T3010 for FY2025 is due in 60 days. Based on your QuickBooks export I have pre-filled Sections A–E. Review and file at CRA My Business Account. [Open draft]"',
  },
  {
    title: 'Grant-Application Coach',
    problem: 'Grant applications favour large orgs with dedicated grant-writing teams. Small orgs self-select out.',
    role: 'Reads the org\'s mission and activities, drafts grant proposals tailored to specific federal/provincial programs, and fills standard forms. Levels the playing field at the application stage, not just the scoring stage.',
    example: '"Based on your mandate to support Indigenous youth literacy, you are eligible for the Community Services Recovery Fund (deadline May 31). I have drafted a proposal — review Section 4 where your outcome metrics need to be added."',
  },
];

// ─── Fade-in hook ─────────────────────────────────────────────────────────────
function useFadeIn(delay = 0) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return visible;
}

// ─── Rule chip ────────────────────────────────────────────────────────────────
const RULE_COLORS = {
  R1: 'bg-amber-100 text-amber-800 border-amber-300',
  R2: 'bg-orange-100 text-orange-800 border-orange-300',
};
function RuleChip({ rule }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${RULE_COLORS[rule] ?? 'bg-gray-100 text-gray-700'}`}>
      {rule}
    </span>
  );
}

// ─── Custom recharts tick (handles \n line breaks) ────────────────────────────
function MultiLineTick({ x, y, payload, width: _w }) {
  const lines = String(payload.value).split('\n');
  const lineHeight = 13;
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={i * lineHeight}
          textAnchor="middle"
          fill="currentColor"
          fontSize={11}
          className="text-muted-foreground"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-20 ${className}`}>
      {children}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SmallOrgAdvocacyPage() {
  const heroVisible = useFadeIn(100);
  const bigNumVisible = useFadeIn(400);

  const { data: ghostStats } = useQuery({
    queryKey: ['ghosts', 'stats'],
    queryFn: fetchGhostsStats,
    staleTime: 5 * 60 * 1000,
  });

  const r2Count = ghostStats?.byRule?.R2?.toLocaleString() ?? '35,262';
  const r1Count = ghostStats?.byRule?.R1?.toLocaleString() ?? '~12,500';

  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-24">

      {/* ── 1. Hero ──────────────────────────────────────────────────────────── */}
      <Section id="hero">
        <div
          className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-950/40 via-background to-background border border-amber-800/30 px-8 py-16 text-center transition-opacity duration-700 ${heroVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* ambient glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Scale className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <div
              className={`transition-all duration-700 delay-300 ${bigNumVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <div className="text-[7rem] font-black leading-none text-amber-400 tracking-tight">
                93%
              </div>
              <p className="mt-2 text-xl text-foreground/80 font-medium">
                of all government funding dollars go to the top 1% of recipients
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                Bottom 90% of recipients (760,000+ organizations) share less than 1%
              </p>
            </div>

            <div className="mt-8 max-w-2xl mx-auto">
              <p className="text-sm text-muted-foreground leading-relaxed">
                An analytical case for refocusing public-funding accountability tools on concentration, not fragmentation.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 2. Concentration data ────────────────────────────────────────────── */}
      <Section id="concentration">
        <h2 className="text-2xl font-bold mb-2">The data: where the money goes</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Across all government funding tracked in this dataset — FED grants, AB grants, AB contracts, AB sole-source, deduplicated for amendment double-counting.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel A — Percentile concentration */}
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Funding concentration by percentile</CardTitle>
              <p className="text-xs text-muted-foreground">Share of total dollars held by each tier</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={CONCENTRATION_PERCENTILE}
                  layout="vertical"
                  margin={{ top: 4, right: 48, left: 10, bottom: 4 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={90}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v) => [`${v}%`, '% of dollars']} />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                    {CONCENTRATION_PERCENTILE.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.pct > 50 ? '#f59e0b' : '#6366f1'}
                      />
                    ))}
                    <LabelList
                      dataKey="pct"
                      position="right"
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: 11, fill: 'currentColor' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Panel B — Cohort population vs funding share */}
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Population share vs. funding share by cohort</CardTitle>
              <p className="text-xs text-muted-foreground">% of entities (orange) vs % of dollars (blue)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={COHORT_POPULATION}
                  margin={{ top: 4, right: 8, left: -20, bottom: 30 }}
                >
                  <XAxis
                    dataKey="cohort"
                    tick={<MultiLineTick />}
                    interval={0}
                  />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, name) => [`${v}%`, name === 'pctPop' ? '% of entities' : '% of dollars']} />
                  <Bar dataKey="pctPop" name="pctPop" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pctDollars" name="pctDollars" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-muted-foreground">
          <strong className="text-foreground">Note on "tiny" cohort:</strong> The tiny cohort is bimodal — 1,102 of those 769,615 entities (0.14%) hold $855B (80.7% of tiny dollars). The bottom 760,000 community-tier recipients split the remaining ~$200B. Most of the "tiny" population by count receives very little.
        </div>

        {/* Full cohort table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cohort</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Entities</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">% of population</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total funding</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">% of dollars</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { cohort: 'tiny (no T3010)', n: '769,615', pctPop: '90.4%', total: '$1,059.9 B', pctDollars: '84.7%', bold: true },
                { cohort: 'small (≤5 emp + T3010)', n: '47,832', pctPop: '5.6%', total: '$4.5 B', pctDollars: '0.4%' },
                { cohort: 'mid', n: '28,175', pctPop: '3.3%', total: '$23.7 B', pctDollars: '1.9%' },
                { cohort: 'large', n: '5,678', pctPop: '0.7%', total: '$162.7 B', pctDollars: '13.0%', bold: true },
              ].map((row) => (
                <tr key={row.cohort} className={row.bold ? 'bg-amber-500/5' : ''}>
                  <td className="px-4 py-2 font-medium">{row.cohort}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.n}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.pctPop}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.total}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold">{row.pctDollars}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 3. Bias: where the engine looks ──────────────────────────────────── */}
      <Section id="bias">
        <h2 className="text-2xl font-bold mb-2">The bias: where the engine looks vs. where money flows</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          The scoring and ghost-detection engine applies its scrutiny in the opposite direction to the dollar risk.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ghost flag rate */}
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Ghost-flag rate by cohort
              </CardTitle>
              <p className="text-xs text-muted-foreground">% of entities in each cohort flagged as ghost orgs</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={GHOST_FLAG_RATE} margin={{ top: 4, right: 40, left: -20, bottom: 4 }}>
                  <XAxis dataKey="cohort" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'flag rate']} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {GHOST_FLAG_RATE.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.rate > 30 ? '#ef4444' : entry.rate > 10 ? '#f59e0b' : '#6366f1'}
                      />
                    ))}
                    <LabelList
                      dataKey="rate"
                      position="top"
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: 11, fill: 'currentColor' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Loop participation */}
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="w-4 h-4 text-red-500" />
                R3 loop participation rate by cohort
              </CardTitle>
              <p className="text-xs text-muted-foreground">Strongest fraud signal — multi-charity gifting cycles</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={LOOP_RATE} margin={{ top: 4, right: 40, left: -20, bottom: 4 }}>
                  <XAxis dataKey="cohort" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'loop participation']} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {LOOP_RATE.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.rate > 3 ? '#ef4444' : entry.rate > 0.5 ? '#f59e0b' : '#6366f1'}
                      />
                    ))}
                    <LabelList
                      dataKey="rate"
                      position="top"
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: 11, fill: 'currentColor' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm leading-relaxed">
          The engine flags {r2Count} community organizations for "received funding without expense activity" — they're orgs that don't file T3010 because they're not required to. The same engine flags 4.81% of large institutions for participating in funding loops, but only 0.086% of small organizations and ~0% of tiny ones.{' '}
          <strong>Small operators are structurally incapable of multi-charity gifting cycles.</strong>
        </div>
      </Section>

      {/* ── 4. Real examples ─────────────────────────────────────────────────── */}
      <Section id="examples">
        <h2 className="text-2xl font-bold mb-2">Real examples: flagged community organizations</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Six entities currently in <code className="text-xs bg-muted px-1 rounded">app_ghost_orgs</code>. Each is a legitimate community operation penalized by rules designed for a different type of entity.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAMPLE_ENTITIES.map((e) => (
            <Card key={e.bn} className="border hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/organizations?q=${encodeURIComponent(e.bn)}`}
                      className="font-semibold text-sm text-foreground hover:text-amber-500 hover:underline leading-snug"
                    >
                      {e.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">BN: {e.bn}</p>
                  </div>
                  <RuleChip rule={e.rule} />
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="font-semibold text-foreground">{e.funding}</span>
                  <span className="text-muted-foreground">{e.year}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                  {e.reason}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── 5. Five arguments ────────────────────────────────────────────────── */}
      <Section id="arguments">
        <h2 className="text-2xl font-bold mb-2">Five arguments for redirecting reviewer attention</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          The heart of the advocacy case — each backed by numbers from the dataset.
        </p>

        <div className="space-y-4">
          {ADVOCACY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.num} className={`border ${card.borderColor}`}>
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-sm ${card.accentColor}`}>
                        {card.num}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${card.accentColor}`} />
                        <h3 className="font-semibold text-base">{card.headline}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{card.data}</p>
                      <p className="text-sm italic text-foreground/70 border-l-2 border-muted pl-3">{card.interpretation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* ── 6. Policy recommendations ────────────────────────────────────────── */}
      <Section id="recommendations">
        <h2 className="text-2xl font-bold mb-2">Policy recommendations</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Concrete, actionable changes — each tied to a specific finding in the analysis.
        </p>

        <Card className="border">
          <CardContent className="p-6">
            <ol className="space-y-5">
              {[
                {
                  num: '1',
                  title: 'Apportion reviewer scrutiny to dollar exposure',
                  body: 'A $50K grant requires a different evaluation calculus than a $50M contract. Update reviewer SOPs to allocate a fixed percentage of review time to the top decile by funding — entities that represent 93% of dollar exposure.',
                },
                {
                  num: '2',
                  title: 'Recognize lean operations',
                  body: 'Update staffingScore and programExpenseScore thresholds to reflect that a 2-person operation with high overhead-ratio isn\'t operationally weak — it\'s small. Separate "lean" from "concerning."',
                },
                {
                  num: '3',
                  title: 'Surface concentration on the Dashboard',
                  body: 'Add a "Highest-funding entities NOT covered by any rule" panel — surfaces the 1,102 entities at $100M+ that currently slip through without generating any engine flags.',
                },
                {
                  num: '4',
                  title: 'Fix the false-positive engine first',
                  body: `Five concrete SQL/scoring changes documented in the bias report would drop ~40K false flags. R2 gating on T3010-history alone removes the ${r2Count} false positives in one line of SQL.`,
                },
                {
                  num: '5',
                  title: 'Add a small-org-friendly view',
                  body: 'A dashboard panel showing the small-cohort distribution: how many recipients, average grant size, year-over-year retention. Useful for advocacy, useful for reviewers, useful for the public.',
                },
              ].map((item) => (
                <li key={item.num} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm">
                    {item.num}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </Section>

      {/* ── 7. Agentic system applications ───────────────────────────────────── */}
      <Section id="agentic">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950/40 via-background to-background border border-indigo-500/30 px-8 py-10 mb-8 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Agentic system applications</h2>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              AI agents could flip the script — redirecting scrutiny toward concentration, lowering compliance friction for small orgs, and making the engine's output richer than any rules-based system alone.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {AGENTIC_CARDS.map((card, i) => (
            <Card key={i} className="border border-indigo-200/30 dark:border-indigo-800/30">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-base">{card.title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Problem</p>
                    <p className="text-muted-foreground leading-relaxed">{card.problem}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Agent role</p>
                    <p className="text-muted-foreground leading-relaxed">{card.role}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/60 border border-border px-4 py-3 text-xs text-foreground/70 leading-relaxed font-mono">
                  <span className="text-indigo-400 font-semibold not-italic text-[10px] uppercase tracking-wider block mb-1">Example prompt / output</span>
                  {card.example}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-muted-foreground italic leading-relaxed">
          Each of these agents is a finite, well-scoped tool — not a magic "fix oversight" agent. Together they redirect attention and lower compliance friction so the engine can do what it's best at: pattern-match against rich data.
        </div>
      </Section>

      {/* ── 8. Footer / Reproducibility ──────────────────────────────────────── */}
      <Section id="footer">
        <Card className="border bg-muted/30">
          <CardContent className="p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Reproducibility</p>
              <p>
                Data as of 2026-04-29. All numbers from{' '}
                <code className="bg-muted px-1 rounded">funding-data-backend/scripts/cohort-bias-probe.ts</code>,{' '}
                <code className="bg-muted px-1 rounded">cohort-funding-distribution.ts</code>,{' '}
                <code className="bg-muted px-1 rounded">cohort-tiny-breakdown.ts</code>.
                Reports at{' '}
                <code className="bg-muted px-1 rounded">docs/reports/small-org-scoring-bias.md</code> and{' '}
                <code className="bg-muted px-1 rounded">docs/reports/small-org-advocacy.md</code>.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground text-sm mb-1">What this analysis does NOT prove</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>That small orgs deliver more impact per dollar — outcome data is not in the warehouse.</li>
                <li>That top recipients are corrupt — concentration is not fraud.</li>
                <li>That every "tiny" entity is a community group — the cohort includes federal contractors and provincial health authorities.</li>
              </ul>
              <p className="mt-2">
                The argument rests on <strong className="text-foreground">"structurally less corruptible" + "currently over-scrutinized,"</strong> not "demonstrably more effective." The data supports the first two claims directly; the third would require outcome data not yet in the warehouse.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>

    </div>
  );
}
