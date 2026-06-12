import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import { AppLayout } from "./components/layout/AppLayout";
import GlobalOps from "./pages/GlobalOps";
import SiteWorkspace from "./pages/site/SiteWorkspace";
import SiteOverview from "./pages/site/SiteOverview";
import SiteAssets from "./pages/site/SiteAssets";
import SiteOperations from "./pages/site/SiteOperations";
import SiteMaintenance from "./pages/site/SiteMaintenance";
import SiteEnergy from "./pages/site/SiteEnergy";
import SiteSLD from "./pages/site/SiteSLD";
import SiteAlarmManagement from "./pages/site/SiteAlarmManagement";
import SiteAIAlarmAdvisor from "./pages/site/SiteAIAlarmAdvisor";
import SiteAIInsights from "./pages/site/SiteAIInsights";
import SiteEventLog from "./pages/site/SiteEventLog";
import SiteSOE from "./pages/site/SiteSOE";
import ExecutiveESG from "./pages/ExecutiveESG";
import TrendingCharts from "./pages/TrendingCharts";
import GridIntegration from "./pages/GridIntegration";
import Documents from "./pages/Documents";
// Solar
import SiteSoilingDetection from "./pages/site/SiteSoilingDetection";
// Wind
import SiteTurbineFaultLog from "./pages/site/SiteTurbineFaultLog";
import SiteWindForecast from "./pages/site/SiteWindForecast";
// Hydro
import SiteWaterManagement from "./pages/site/SiteWaterManagement";
import SiteWaterAlerts from "./pages/site/SiteWaterAlerts";
import SiteFlowForecast from "./pages/site/SiteFlowForecast";
// BESS
import SiteBMSFaultLog from "./pages/site/SiteBMSFaultLog";
import SiteDispatchOptimizer from "./pages/site/SiteDispatchOptimizer";
import SiteDegradationForecast from "./pages/site/SiteDegradationForecast";
// Hybrid
import SiteMultiSourceOptimizer from "./pages/site/SiteMultiSourceOptimizer";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — requires login */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<GlobalOps />} />
              <Route path="/site/:id" element={<SiteWorkspace />}>
                <Route index element={<SiteOverview />} />
                <Route path="assets" element={<SiteAssets />} />
                <Route path="operations" element={<SiteOperations />} />
                <Route path="maintenance" element={<SiteMaintenance />} />
                <Route path="energy" element={<SiteEnergy />} />
                <Route path="sld" element={<SiteSLD />} />
                <Route path="alarms" element={<SiteAlarmManagement />} />
                <Route path="events" element={<SiteEventLog />} />
                <Route path="soe" element={<SiteSOE />} />
                <Route path="ai-insights" element={<SiteAIInsights />} />
                <Route path="ai-alarms" element={<SiteAIAlarmAdvisor />} />
                {/* Solar */}
                <Route path="soiling" element={<SiteSoilingDetection />} />
                {/* Wind */}
                <Route path="turbine-faults" element={<SiteTurbineFaultLog />} />
                <Route path="wind-forecast" element={<SiteWindForecast />} />
                {/* Hydro */}
                <Route path="water-management" element={<SiteWaterManagement />} />
                <Route path="water-alerts" element={<SiteWaterAlerts />} />
                <Route path="flow-forecast" element={<SiteFlowForecast />} />
                {/* BESS */}
                <Route path="bms-faults" element={<SiteBMSFaultLog />} />
                <Route path="dispatch-optimizer" element={<SiteDispatchOptimizer />} />
                <Route path="degradation" element={<SiteDegradationForecast />} />
                {/* Hybrid */}
                <Route path="multi-source" element={<SiteMultiSourceOptimizer />} />
              </Route>
              <Route path="/executive" element={<ExecutiveESG />} />
              <Route path="/trending" element={<TrendingCharts />} />
              <Route path="/grid" element={<GridIntegration />} />
              <Route path="/documents" element={<Documents />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
