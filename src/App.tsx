import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useUserRole } from "@/hooks/useUserRole";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import WeatherPage from "./pages/WeatherPage";
import MarketPage from "./pages/MarketPage";
import CropsPage from "./pages/CropsPage";
import ScannerPage from "./pages/ScannerPage";
import PlannerPage from "./pages/PlannerPage";
import SimulatorPage from "./pages/SimulatorPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import EmailVerified from "./pages/EmailVerified";
import ResetPassword from "./pages/ResetPassword";
import OnboardingWizard from "./pages/OnboardingWizard";
import ProfilePage from "./pages/ProfilePage";
import ActiveCropsPage from "./pages/ActiveCropsPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import MarketplacePage from "./pages/MarketplacePage";
import VerificationPage from "./pages/VerificationPage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    const check = async () => {
      const role = user.user_metadata?.role || "farmer";
      // Skip onboarding entirely for non-farmer roles
      if (role !== "farmer") {
        // Auto-complete onboarding for seed_seller and consumer
        await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
        setCheckingOnboarding(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle();
      if (data && !data.onboarding_completed) {
        setNeedsOnboarding(true);
      }
      setCheckingOnboarding(false);
    };
    check();
  }, [user, loading]);

  if (loading || checkingOnboarding) return null;
  if (!user) return <Navigate to="/" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (loading) return;

    const checkAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      const role = user.user_metadata?.role || "farmer";
      if (role !== "farmer") {
        setCheckingAccess(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      setShowOnboarding(!data?.onboarding_completed);
      setCheckingAccess(false);
    };

    checkAccess();
  }, [user, loading]);

  if (loading || checkingAccess) return null;
  if (!user) return <Navigate to="/" replace />;

  const role = user.user_metadata?.role || "farmer";
  if (role !== "farmer") return <Navigate to="/dashboard/marketplace" replace />;
  if (!showOnboarding) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

// Route guard for farmer-only pages
function FarmerRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useUserRole();
  if (loading) return null;
  if (role !== "farmer") return <Navigate to="/dashboard/marketplace" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/email-verified" element={<EmailVerified />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/delete-account" element={<DeleteAccountPage />} />
              <Route path="/onboarding" element={<OnboardingRoute><OnboardingWizard /></OnboardingRoute>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<OverviewPage />} />
                <Route path="weather" element={<FarmerRoute><WeatherPage /></FarmerRoute>} />
                <Route path="market" element={<FarmerRoute><MarketPage /></FarmerRoute>} />
                <Route path="crops" element={<FarmerRoute><CropsPage /></FarmerRoute>} />
                <Route path="scanner" element={<FarmerRoute><ScannerPage /></FarmerRoute>} />
                <Route path="planner" element={<FarmerRoute><PlannerPage /></FarmerRoute>} />
                <Route path="simulator" element={<FarmerRoute><SimulatorPage /></FarmerRoute>} />
                <Route path="evidence" element={<Navigate to="/dashboard/scanner" replace />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="active-crops" element={<FarmerRoute><ActiveCropsPage /></FarmerRoute>} />
                <Route path="marketplace" element={<MarketplacePage />} />
                <Route path="verification" element={<VerificationPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
