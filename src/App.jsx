import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import OrganizationsList from '@/pages/OrganizationsList';
import OrganizationNew from '@/pages/OrganizationNew';
import OrganizationProfile from '@/pages/OrganizationProfile';
import ReviewQueue from '@/pages/ReviewQueue';
import BenchmarksPage from '@/pages/BenchmarksPage';
import SettingsPage from '@/pages/SettingsPage';
import IntakePage from '@/pages/IntakePage';
import AnalysisLab from '@/pages/AnalysisLab';
import DataExplorer from '@/pages/DataExplorer';
import MismatchEngine from '@/pages/MismatchEngine';
import CredibilityEngine from '@/pages/CredibilityEngine';
import DecisionEngine from '@/pages/DecisionEngine';
import LoopsPage from '@/pages/LoopsPage';
import CrossSourcePage from '@/pages/CrossSourcePage';
import AmendmentCreepPage from '@/pages/AmendmentCreepPage';
import VendorConcentrationPage from '@/pages/VendorConcentrationPage';
import NetworksPage from '@/pages/NetworksPage';
import PolicyAlignmentPage from '@/pages/PolicyAlignmentPage';
import ContractIntelligencePage from '@/pages/ContractIntelligencePage';
import AdverseMediaPage from '@/pages/AdverseMediaPage';

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