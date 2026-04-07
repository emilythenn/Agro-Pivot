import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Leaf, Sprout, CalendarDays, Loader2, RefreshCw, MapPin, Droplets, TrendingUp, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCropAdvisory, getScanHistory } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MALAYSIA_STATES, STATE_LIST } from "@/lib/malaysiaLocations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FarmContextBanner, profileToFarmContext } from "@/components/FarmContextBanner";

export default function PlannerPage() {
  const { t } = useSettings();
  const { user } = useAuth();
  const { profile, activeCrops, loading: profileLoading, version } = useUserProfile();
  const farmContext = profileToFarmContext(profile);
  const [loading, setLoading] = useState(true);
  const [rescueCrops, setRescueCrops] = useState<any[]>([]);
  const [failedBatches, setFailedBatches] = useState(0);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  useEffect(() => {
    if (!profileLoading && profile.state) {
      setSelectedState(profile.state);
      setSelectedDistrict(profile.district);
    }
  }, [profileLoading, profile.state, profile.district, version]);

  const districts = MALAYSIA_STATES[selectedState] || [];

  const loadData = async (district?: string) => {
    const d = district || selectedDistrict;
    if (!d) return;
    setLoading(true);
    try {
      const [advisory, scans] = await Promise.all([
        fetchCropAdvisory(d, "rescue", "en", farmContext),
        user ? getScanHistory(user.id) : Promise.resolve([]),
      ]);
      setFailedBatches(scans.filter((s: any) => s.status === "anomaly").length);
      setRescueCrops((advisory.recommendations || []).map((rec: any) => ({
        name: rec.crop,
        seasonWindow: rec.season_window || "N/A",
        type: rec.climate_risk === "low" ? "Quick Crop" : "Standard",
        water: rec.climate_risk === "high" ? "High" : rec.climate_risk === "medium" ? "Medium" : "Low",
        profit: rec.profit_score || 50,
        expectedYield: rec.expected_yield || "N/A",
        window: rec.action === "plant" ? "available" : rec.action === "hold" ? "limited" : "unavailable",
        suitability: rec.profit_score || 50,
        advice: rec.advice,
        marketTrend: rec.market_trend || "stable",
        climateRisk: rec.climate_risk || "medium",
        action: rec.action || "plant",
      })));
    } catch (e: any) {
      toast({ title: "Failed to load planner data", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDistrict) loadData();
  }, [selectedDistrict, user]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    const firstDistrict = MALAYSIA_STATES[state]?.[0] || state;
    setSelectedDistrict(firstDistrict);
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
  };

  const getSeasonInfo = () => {
    const now = new Date();
    const month = now.getMonth();
    let seasonEnd: Date;
    let seasonName: string;
    if (month >= 7 || month <= 0) {
      seasonEnd = new Date(month >= 7 ? now.getFullYear() + 1 : now.getFullYear(), 1, 28);
      seasonName = "Main Season";
    } else {
      seasonEnd = new Date(now.getFullYear(), 7, 1);
      seasonName = "Off Season";
    }
    const daysRemaining = Math.max(0, Math.ceil((seasonEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const endDate = seasonEnd.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
    return { daysRemaining, seasonName, endDate };
  };

  const seasonInfo = getSeasonInfo();

  if (profileLoading || !selectedState) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-1">{t("planner.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("planner.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>

      <FarmContextBanner profile={profile} activeCrops={activeCrops} />

      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-foreground">Location</span>
          <span className="text-[10px] text-muted-foreground/60 ml-2">(synced from your profile)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">State</label>
            <Select value={selectedState} onValueChange={handleStateChange}>
              <SelectTrigger className="w-full bg-secondary/20 border-border/40"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{STATE_LIST.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">District</label>
            <Select value={selectedDistrict} onValueChange={handleDistrictChange}>
              <SelectTrigger className="w-full bg-secondary/20 border-border/40"><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent>{districts.map((district) => <SelectItem key={district} value={district}>{district}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: t("planner.seasonRemaining"), value: `${seasonInfo.daysRemaining} days`, icon: CalendarDays, sub: `${seasonInfo.seasonName} — Ends: ${seasonInfo.endDate}` },
              { label: t("planner.failedBatches"), value: String(failedBatches), icon: Sprout, sub: failedBatches > 0 ? "Anomalies detected" : "All healthy" },
              { label: t("planner.recoveryOptions"), value: String(rescueCrops.length), icon: Leaf, sub: `${selectedDistrict}, ${selectedState}` },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">Rescue Crop Options — {selectedDistrict}, {selectedState}</h3>
            {rescueCrops.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Leaf className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No rescue crops found. Try a different location.</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {rescueCrops.map((crop: any, i: number) => (
                  <motion.div key={crop.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                    <GlassCard hoverable className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-foreground">{crop.name}</h3>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${crop.action === "plant" ? "bg-primary/10 text-primary" : crop.action === "hold" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                              {crop.action === "plant" ? "Plant Now" : crop.action === "hold" ? "Monitor" : "Avoid"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{crop.type}</p>
                          {crop.advice && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{crop.advice}</p>}
                        </div>
                        <StatusBadge variant={crop.window === "available" ? "green" : crop.window === "limited" ? "warning" : "red"}>
                          {crop.window === "available" ? t("planner.available") : crop.window === "limited" ? t("planner.limited") : "Unavailable"}
                        </StatusBadge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
                        <div><span className="text-muted-foreground block mb-1">Season Window</span><span className="font-semibold text-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />{crop.seasonWindow}</span></div>
                        <div><span className="text-muted-foreground block mb-1">{t("planner.waterNeeds")}</span><span className="font-semibold text-foreground flex items-center gap-1"><Droplets className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />{crop.water}</span></div>
                        <div><span className="text-muted-foreground block mb-1">Expected Yield</span><span className="font-semibold tabular-nums text-foreground">{crop.expectedYield}</span></div>
                        <div><span className="text-muted-foreground block mb-1">Market Trend</span><StatusBadge variant={crop.marketTrend === "up" ? "green" : crop.marketTrend === "down" ? "red" : "accent"}><TrendingUp className="h-3 w-3" /> {crop.marketTrend}</StatusBadge></div>
                        <div>
                          <span className="text-muted-foreground block mb-1">{t("planner.suitability")}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-2 bg-secondary/40 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${crop.suitability > 80 ? "bg-primary" : crop.suitability > 60 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${crop.suitability}%` }} />
                            </div>
                            <span className="font-bold tabular-nums text-foreground">{crop.suitability}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">Climate Risk:</span>
                        <StatusBadge variant={crop.climateRisk === "low" ? "green" : crop.climateRisk === "medium" ? "warning" : "red"}>
                          <ShieldCheck className="h-3 w-3" /> {crop.climateRisk}
                        </StatusBadge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Profit Score: <span className={`font-bold text-sm ${crop.profit > 75 ? "text-primary" : crop.profit > 50 ? "text-warning" : "text-destructive"}`}>{crop.profit}/100</span>
                        </span>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
