import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';

// Code-split every route. The Dashboard is the most common landing page so
// it can stay eager-loaded for instant first paint; everything else loads
// on demand. This trims the initial JS bundle from ~1.28 MB to ~250–400 KB
// for first-paint depending on entry route.
import Dashboard from '@/pages/Dashboard';
const OrganizationsList     = lazy(() => import('@/pages/OrganizationsList'));
const OrganizationNew       = lazy(() => import('@/pages/OrganizationNew'));
const OrganizationProfile   = lazy(() => import('@/pages/OrganizationProfile'));
const ReviewQueue           = lazy(() => import('@/pages/ReviewQueue'));
const BenchmarksPage        = lazy(() => import('@/pages/BenchmarksPage'));
const SettingsPage          = lazy(() => import('@/pages/SettingsPage'));
const IntakePage            = lazy(() => import('@/pages/IntakePage'));
const AnalysisLab           = lazy(() => import('@/pages/AnalysisLab'));
const DataExplorer          = lazy(() => import('@/pages/DataExplorer'));
const MismatchEngine        = lazy(() => import('@/pages/MismatchEngine'));
const CredibilityEngine     = lazy(() => import('@/pages/CredibilityEngine'));
const DecisionEngine        = lazy(() => import('@/pages/DecisionEngine'));
const LoopsPage             = lazy(() => import('@/pages/LoopsPage'));
const CrossSourcePage       = lazy(() => import('@/pages/CrossSourcePage'));
const AmendmentCreepPage    = lazy(() => import('@/pages/AmendmentCreepPage'));
const VendorConcentrationPage = lazy(() => import('@/pages/VendorConcentrationPage'));
const NetworksPage          = lazy(() => import('@/pages/NetworksPage'));
const PolicyAlignmentPage   = lazy(() => import('@/pages/PolicyAlignmentPage'));
const ContractIntelligencePage = lazy(() => import('@/pages/ContractIntelligencePage'));
const AdverseMediaPage      = lazy(() => import('@/pages/AdverseMediaPage'));

// Lightweight placeholder shown while a code-split page chunk loads. Sub-300ms
// in practice on a warm cache; this keeps the UI from flashing blank.
function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Proof of Capacity Engine...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/organizations" element={<OrganizationsList />} />
          <Route path="/organizations/new" element={<OrganizationNew />} />
          <Route path="/organizations/:id" element={<OrganizationProfile />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/review-queue" element={<ReviewQueue />} />
          <Route path="/benchmarks" element={<BenchmarksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/lab" element={<AnalysisLab />} />
          <Route path="/explorer" element={<DataExplorer />} />
          <Route path="/mismatch" element={<MismatchEngine />} />
          <Route path="/credibility" element={<CredibilityEngine />} />
          <Route path="/decisions" element={<DecisionEngine />} />
          <Route path="/loops" element={<LoopsPage />} />
          <Route path="/cross-source" element={<CrossSourcePage />} />
          <Route path="/amendments" element={<AmendmentCreepPage />} />
          <Route path="/vendor-concentration" element={<VendorConcentrationPage />} />
          <Route path="/networks" element={<NetworksPage />} />
          <Route path="/policy-alignment" element={<PolicyAlignmentPage />} />
          <Route path="/contract-intelligence" element={<ContractIntelligencePage />} />
          <Route path="/adverse-media" element={<AdverseMediaPage />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App