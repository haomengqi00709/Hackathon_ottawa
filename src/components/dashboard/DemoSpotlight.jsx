import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Database, X, AlertTriangle, ShieldX, HelpCircle } from 'lucide-react';

const DEMO_ORGS = [
  {
    id: '51e08533-46a9-5e2e-8ba2-b8295a8b8b3f',
    name: 'ST FRANCIS ADVOCATES FOR THE AUTISTIC & DEVELOPMENTALLY DIS',
    province: 'ON',
    score: 23,
    ghostScore: 10,
    risk: 'high',
    tagline: '🚨 Ghost — Score 10/10',
    description: 'Claims to serve autistic and developmentally disabled Canadians. Reports zero paid employees and zero program spend while receiving $11.8M in government funding annually.',
    verdict: 'Formal investigation required before any renewal.',
    verdictClass: 'text-red-700 bg-red-50 border-red-200',
    scoreColor: 'text-red-600',
    borderColor: 'border-red-200',
    bg: 'bg-red-50',
    badgeBg: 'bg-red-100 text-red-800',
    Icon: ShieldX,
    iconClass: 'text-red-500',
    talking_points: [
      '0 paid employees, 103 volunteers only',
      '$11,812,531 in government funding received',
      '$0 reported in program delivery spending',
    ],
  },
  {
    id: 'e379208d-ec7d-598c-a032-9a2931c4e2eb',
    name: 'CLEARVIEW PUBLIC LIBRARY BOARD',
    province: 'ON',
    score: 23,
    ghostScore: 10,
    risk: 'high',
    tagline: '🚨 Ghost — Score 10/10',
    description: 'A public library board that reported zero employees, zero program expenditure, and $925K in government funding — with compensation paid despite having no staff on record.',
    verdict: 'Suspend funding. Compliance audit required.',
    verdictClass: 'text-red-700 bg-red-50 border-red-200',
    scoreColor: 'text-red-600',
    borderColor: 'border-red-200',
    bg: 'bg-red-50',
    badgeBg: 'bg-red-100 text-red-800',
    Icon: AlertTriangle,
    iconClass: 'text-red-500',
    talking_points: [
      '0 employees — compensation paid with no staff',
      '$925,532 in public funding, $0 program spend',
      'Legally registered as active charity',
    ],
  },
  {
    id: 'd40df911-ed58-5e17-a9fe-fdba92539915',
    name: 'THE GEORGE SPADY CENTRE SOCIETY',
    province: 'AB',
    score: 42,
    ghostScore: 7,
    risk: 'moderate',
    tagline: '⚠️ Borderline — Score 7/10',
    description: 'An Alberta shelter society with $14.7M in government funding and meaningful program spend — but zero reported employees. Compensation is paid with no identifiable workforce.',
    verdict: 'Enhanced monitoring recommended at renewal.',
    verdictClass: 'text-orange-700 bg-orange-50 border-orange-200',
    scoreColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    bg: 'bg-orange-50',
    badgeBg: 'bg-orange-100 text-orange-800',
    Icon: HelpCircle,
    iconClass: 'text-orange-500',
    talking_points: [
      '0 paid employees, 72 volunteers',
      '$14,738,806 govt funding — 95% dependency',
      '$13,976,485 in program spend (positive signal)',
    ],
  },
];

export default function DemoSpotlight() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/10">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Real Cases — CRA T3010 Data
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {DEMO_ORGS.map((org) => {
          const Icon = org.Icon;
          return (
            <div key={org.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${org.badgeBg}`}>
                    {org.tagline}
                  </span>
                  <p className="font-semibold text-sm leading-snug">{org.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{org.province} · CRA Registered Charity</p>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`text-2xl font-bold tabular-nums leading-none ${org.scoreColor}`}>{org.score}</span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{org.description}</p>

              <ul className="space-y-1">
                {org.talking_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${org.iconClass}`} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${org.verdictClass}`}>
                {org.verdict}
              </div>

              <Link
                to={`/organizations/${org.id}`}
                className={`mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${org.bg} ${org.borderColor} hover:opacity-80`}
              >
                Open Profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
