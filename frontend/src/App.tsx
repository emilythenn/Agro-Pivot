import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import { ChatBot } from "./components/ChatBot.tsx";
import { VoiceAssistant } from "./components/VoiceAssistant.tsx";
import DashboardLayout from "./components/DashboardLayout.tsx";
import OverviewPage from "./pages/OverviewPage.tsx";
import WeatherPage from "./pages/WeatherPage.tsx";
import MarketPage from "./pages/MarketPage.tsx";
import CropsPage from "./pages/CropsPage.tsx";
import ScannerPage from "./pages/ScannerPage.tsx";
import EvidencePage from "./pages/EvidencePage.tsx";
import PlannerPage from "./pages/PlannerPage.tsx";
import SimulatorPage from "./pages/SimulatorPage.tsx";
import AlertsPage from "./pages/AlertsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import AuthConfirm from "./pages/AuthConfirm.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="weather" element={<WeatherPage />} />
                <Route path="market" element={<MarketPage />} />
                <Route path="crops" element={<CropsPage />} />
                <Route path="scanner" element={<ScannerPage />} />
                <Route path="evidence" element={<EvidencePage />} />
                <Route path="planner" element={<PlannerPage />} />
                <Route path="simulator" element={<SimulatorPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <VoiceAssistant />
            <ChatBot />
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
