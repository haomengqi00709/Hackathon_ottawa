import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, ClipboardCheck, FileSearch,
  ListChecks, Sliders, Settings, Shield, Menu, X, ChevronRight, ClipboardList, FlaskConical, Database,
  ScanSearch, Activity, Zap,
  Repeat, Layers, ScrollText, GitBranch, Users2, Target, LineChart, AlertTriangle, Ghost,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navSections = [
  {
    label: 'Workflow',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/organizations', label: 'Organizations', icon: Building2 },
      { path: '/intake', label: 'Intake', icon: ClipboardList },
      { path: '/review-queue', label: 'Review Queue', icon: ListChecks },
    ],
  },
  {
    label: 'Engines',
    items: [
      { path: '/lab', label: 'Analysis Lab', icon: FlaskConical },
      { path: '/explorer', label: 'Data Explorer', icon: Database },
      { path: '/mismatch', label: 'Mismatch · Ghost', icon: ScanSearch },
      { path: '/credibility', label: 'Credibility · Zombie', icon: Activity },
      { path: '/decisions', label: 'Decision Engine', icon: Zap },
    ],
  },
  {
    label: 'Funding-integrity probes',
    items: [
      { path: '/loops', label: 'Funding Loops', icon: Repeat, problem: 3 },
      { path: '/amendments', label: 'Amendment Creep', icon: ScrollText, problem: 4 },
      { path: '/vendor-concentration', label: 'Vendor Concentration', icon: GitBranch, problem: 5 },
      { path: '/networks', label: 'Director Networks', icon: Users2, problem: 6 },
      { path: '/policy-alignment', label: 'Policy Alignment', icon: Target, problem: 7 },
      { path: '/cross-source', label: 'Cross-Source', icon: Layers, problem: 8 },
      { path: '/contract-intelligence', label: 'Contract Intelligence', icon: LineChart, problem: 9 },
      { path: '/adverse-media', label: 'Adverse Media', icon: AlertTriangle, problem: 10 },
      { path: '/ghosts', label: 'Ghost Analysis', icon: Ghost },
    ],
  },
  {
    label: 'Admin',
    items: [
      { path: '/benchmarks', label: 'Benchmarks', icon: Sliders },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-sidebar-primary">Proof of Capacity</h1>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Assessment System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map(item => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.problem && (
                        <span className="text-[10px] text-sidebar-foreground/40 font-mono">#{item.problem}</span>
                      )}
                      {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider mb-1">Notice</p>
            <p className="text-[11px] text-sidebar-foreground/60 leading-relaxed">
              Assessments are indicative only. They do not constitute a determination of misconduct or legal non-compliance.
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Pre-Deployment Review Build
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}