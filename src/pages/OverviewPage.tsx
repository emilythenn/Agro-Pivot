import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAutoRefresh } from "@/hooks/useDataRefresh";
import { WeatherTicker } from "@/components/WeatherTicker";
import { GlassCard } from "@/components/GlassCard";
import { AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Minus, Camera, BarChart3, Loader2, FileText, Download, FlaskConical, Settings, Clock, ArrowRight, Sprout, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { getScanHistory, getAlerts, getEvidenceReports, fetchMarketPrices } from "@/lib/api";
import { triggerNotificationEngine } from "@/lib/notificationService";
import { getRecentActivities } from "@/lib/activityLogger";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FarmContextBanner, profileToFarmContext } from "@/components/FarmContextBanner";
import { supabase } from "@/integrations/supabase/client";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: "text-primary", down: "text-destructive", stable: "text-muted-foreground" };

function MarketTickerPreview({ district, language, farmContext }: { district: string; language: string; farmContext: any }) {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketPrices(district, language, farmContext)
      .then((data) => setMarketData((data.prices || []).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [district, language]);

  if (loading) {
    return (
      <GlassCard className="p-4 flex items-center justify-center h-24">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Market Prices — {district}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50">Top {marketData.length} crops</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {marketData.map((item: any, i: number) => {
          const trend = item.trend || "stable";
          const Icon = trendIcon[trend as keyof typeof trendIcon] || Minus;
          return (
            <motion.div key={item.crop} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div>
                <div className="text-xs text-muted-foreground">{item.crop}</div>
                <div className="text-sm font-medium tabular-nums">RM {(item.price_rm || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">{item.unit}</span></div>
              </div>
              <div className={`flex items-center gap-1 flex-shrink-0 ${trendColor[trend as keyof typeof trendColor] || "text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-xs font-medium tabular-nums">{item.change_percent > 0 ? "+" : ""}{item.change_percent}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

const activityIcons: Record<string, any> = {
  scan: Camera, report_generated: FileText, report_downloaded: Download,
  simulation: FlaskConical, settings_updated: Settings, login: ShieldCheck, alert: AlertTriangle,
};
const activityColors: Record<string, string> = {
  scan: "bg-accent/10 text-accent", report_generated: "bg-primary/10 text-primary",
  report_downloaded: "bg-primary/10 text-primary", simulation: "bg-warning/10 text-warning",
  settings_updated: "bg-muted text-muted-foreground", login: "bg-primary/10 text-primary",
  alert: "bg-destructive/10 text-destructive",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { user } = useAuth();
  const { profile, activeCrops, loading: profileLoading } = useUserProfile();
  const [stats, setStats] = useState({ scans: 0, alerts: 0, reports: 0, anomalies: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cropSuggestions, setCropSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const farmContext = profileToFarmContext(profile);

  const loadDashboardData = useCallback(() => {
    if (!user) return;
    triggerNotificationEngine(user.id).catch(console.error);

    Promise.all([
      getScanHistory(user.id),
      getAlerts(user.id),
      getEvidenceReports(user.id),
      getRecentActivities(user.id, 8),
    ]).then(([scans, alerts, reports, recentActs]) => {
      setStats({
        scans: scans.length,
        alerts: alerts.filter((a: any) => !a.read).length,
        reports: reports.length,
        anomalies: scans.filter((s: any) => s.status === "anomaly").length,
      });
      setActivities(recentActs);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  // Auto-refresh when data changes on other pages
  useAutoRefresh(loadDashboardData, ["crops", "scans", "alerts", "evidence", "activity", "profiles"]);

  // Fetch AI crop suggestions
  useEffect(() => {
    if (!user || profileLoading || !profile.district) return;
    setSuggestionsLoading(true);
    supabase.functions.invoke("crop-advisory", {
      body: { district: profile.district, mode: "advisory", language, farm_context: farmContext },
    }).then(({ data, error }) => {
      if (!error && data?.recommendations) {
        setCropSuggestions(data.recommendations.slice(0, 4));
      }
    }).catch(console.error).finally(() => setSuggestionsLoading(false));
  }, [user, profileLoading, profile.district]);

  const quickStats = [
    { label: t("overview.activeCrops"), value: String(activeCrops.length), icon: Sprout, color: "text-primary", link: "/dashboard/active-crops" },
    { label: "Alerts & News", value: String(stats.alerts), icon: AlertTriangle, color: "text-warning", link: "/dashboard/alerts" },
    { label: "Crop Suggestions", value: suggestionsLoading ? "..." : String(cropSuggestions.length), icon: Lightbulb, color: "text-accent", link: "/dashboard/crops" },
    { label: t("overview.reports"), value: String(stats.reports), icon: BarChart3, color: "text-primary", link: "/dashboard/evidence" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-2xl font-bold font-serif text-foreground">
          {profile.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}` : t("overview.status")} <span className="text-primary">{t("overview.operational")}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          {profile.farm_name ? `${profile.farm_name} — ` : ""}{profile.district}, {profile.state}
          {activeCrops.length > 0 && ` • ${activeCrops.join(", ")}`}
        </p>
      </motion.div>

      {/* Farm Profile Banner */}
      {!profileLoading && <FarmContextBanner profile={profile} activeCrops={activeCrops} compact />}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="cursor-pointer" onClick={() => navigate(stat.link)}>
              <GlassCard hoverable className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stat.value}
                </p>
              </GlassCard>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Weather Forecast */}
      <div>
        <div className="cursor-pointer" onClick={() => navigate("/dashboard/weather")}>
          <WeatherTicker />
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={() => navigate("/dashboard/weather")} className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
            View Full Forecast <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Market Prices */}
      <div>
        <div className="cursor-pointer" onClick={() => navigate("/dashboard/market")}>
          <MarketTickerPreview district={profile.district} language={language} farmContext={farmContext} />
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={() => navigate("/dashboard/market")} className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
            View All Prices <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>



      {/* Recent Activity */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-foreground">{t("overview.recentActivity")}</h3>
          </div>
          {activities.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60 bg-secondary/30 px-2 py-0.5 rounded-md">
              {activities.length} recent
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-xl bg-secondary/30 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start by scanning your crops or running a simulation!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity: any, i: number) => {
              const Icon = activityIcons[activity.activity_type] || Clock;
              const colorClass = activityColors[activity.activity_type] || "bg-secondary/30 text-muted-foreground";
              return (
                <motion.div key={activity.id} className="flex items-center gap-3.5 py-3 px-3 rounded-xl hover:bg-secondary/20 transition-colors group" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    {activity.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.description}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 whitespace-nowrap">{timeAgo(activity.created_at)}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
