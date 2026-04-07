import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sprout, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, ChevronRight, Loader2, RefreshCw, MapPin,
  Lightbulb, DollarSign, Zap, XCircle, CheckCircle2, Star
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useSettings } from "@/contexts/SettingsContext";
import { fetchMarketPrices } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MALAYSIA_STATES, STATE_LIST } from "@/lib/malaysiaLocations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FarmContextBanner, profileToFarmContext } from "@/components/FarmContextBanner";
import { useAutoRefresh } from "@/hooks/useDataRefresh";

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-secondary/30 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>{score}</span>
    </div>
  );
}

export default function CropsPage() {
  const { t, language } = useSettings();
  const { profile, activeCrops, loading: profileLoading, version } = useUserProfile();
  const farmContext = profileToFarmContext(profile);
  const [loading, setLoading] = useState(true);
  const [recommendedCrops, setRecommendedCrops] = useState<any[]>([]);
  const [avoidCrops, setAvoidCrops] = useState<any[]>([]);
  const [preferredAnalysis, setPreferredAnalysis] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const preferredCrops = (profile.preferred_crops || "").split(",").map(c => c.trim()).filter(Boolean);

  useEffect(() => {
    if (!profileLoading) {
      if (profile.state) {
        setSelectedState(profile.state);
        setSelectedDistrict(profile.district || MALAYSIA_STATES[profile.state]?.[0] || "");
      } else {
        setSelectedState("W.P. Kuala Lumpur");
        setSelectedDistrict("Kuala Lumpur");
      }
    }
  }, [profileLoading, profile.state, profile.district, version]);

  const districts = MALAYSIA_STATES[selectedState] || [];

  const loadAdvisory = useCallback(async (district?: string) => {
    const d = district || selectedDistrict || "Kuala Lumpur";
    setLoading(true);
    try {
      const data = await fetchMarketPrices(d, language, farmContext);
      setRecommendedCrops(data.recommended_crops || []);
      setAvoidCrops(data.avoid_crops || []);
      setPreferredAnalysis(data.preferred_crop_analysis || []);
    } catch (e: any) {
      toast({ title: "Failed to load crop advisory", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, language, farmContext]);

  useEffect(() => {
    if (selectedDistrict) loadAdvisory();
  }, [selectedDistrict, language]);

  useAutoRefresh(loadAdvisory, ["crops", "profiles"]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    const firstDistrict = MALAYSIA_STATES[state]?.[0] || state;
    setSelectedDistrict(firstDistrict);
  };

  if (profileLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-1">{t("crops.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("crops.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadAdvisory()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>

      <FarmContextBanner profile={profile} activeCrops={activeCrops} compact />

      {/* Location Selector */}
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
            <Select value={selectedDistrict} onValueChange={(d) => setSelectedDistrict(d)}>
              <SelectTrigger className="w-full bg-secondary/20 border-border/40"><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent>{districts.map((district) => <SelectItem key={district} value={district}>{district}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing farm conditions & generating recommendations...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ═══ SECTION 1: RECOMMENDED CROPS FOR YOUR FARM ═══ */}
          {recommendedCrops.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">🌱 Recommended Crops for Your Farm</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Based on current climate, farm conditions, and market trends</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedCrops.slice(0, 6).map((crop, i) => (
                  <motion.div key={crop.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard hoverable className="p-5 h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-base font-bold text-foreground">{crop.name}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm font-semibold text-primary tabular-nums">
                              RM {(crop.price_rm || 0).toLocaleString()}{crop.unit || "/kg"}
                            </span>
                            {crop.trend && (
                              <StatusBadge variant={crop.trend === "up" ? "green" : crop.trend === "down" ? "red" : "accent"}>
                                {crop.trend === "up" ? "📈" : crop.trend === "down" ? "📉" : "➡️"} {crop.change_percent > 0 ? "+" : ""}{crop.change_percent || 0}%
                              </StatusBadge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                          <div className={`text-xl font-black tabular-nums ${(crop.score || 0) >= 75 ? "text-emerald-600" : (crop.score || 0) >= 50 ? "text-amber-600" : "text-red-600"}`}>{crop.score || 0}</div>
                        </div>
                      </div>

                      <ScoreBar score={crop.score || 0} />

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center p-2 rounded-lg bg-secondary/20">
                          <div className="text-[9px] text-muted-foreground uppercase">Risk</div>
                          <div className={`text-xs font-bold ${crop.risk_level === "Low" ? "text-emerald-600" : crop.risk_level === "Medium" ? "text-amber-600" : "text-red-600"}`}>
                            {crop.risk_level || "Medium"}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-secondary/20">
                          <div className="text-[9px] text-muted-foreground uppercase">Demand</div>
                          <div className="text-xs font-bold text-foreground">{crop.demand || "Medium"}</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-secondary/20">
                          <div className="text-[9px] text-muted-foreground uppercase">Duration</div>
                          <div className="text-xs font-bold text-foreground">{crop.growth_duration_days || "?"}d</div>
                        </div>
                      </div>

                      {(crop.estimated_cost_rm || crop.estimated_revenue_rm) && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/20">
                          {crop.estimated_cost_rm > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" /> Cost: <span className="font-semibold text-foreground">RM {crop.estimated_cost_rm.toLocaleString()}</span>
                            </div>
                          )}
                          {crop.estimated_revenue_rm > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3 text-primary" /> Revenue: <span className="font-semibold text-primary">RM {crop.estimated_revenue_rm.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {crop.reason && (
                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed bg-secondary/10 rounded-lg p-2.5">
                          💡 {crop.reason}
                        </p>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 2: SMART RECOMMENDATIONS (based on preferred crops) ═══ */}
          {avoidCrops.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold text-foreground">🔄 Smart Recommendations</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Based on your preferred crops — if a preferred crop isn't suitable for your farm conditions, we recommend better alternatives.
              </p>
              {avoidCrops.map((item, i) => (
                <GlassCard key={i} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-bold text-destructive">{item.name} — Not Recommended</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">{item.reason}</p>
                    </div>
                    {item.alternative && (
                      <div className="flex-1 border-l border-border/30 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-primary">✅ Try: {item.alternative}</span>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">{item.alternative_reason}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}

          {/* ═══ SECTION 3: PREFERRED CROP SUITABILITY ANALYSIS ═══ */}
          {preferredAnalysis.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">⭐ Your Preferred Crops — Suitability Analysis</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Are your planned crops suitable for your farm? Here's what our AI engine found.</p>

              <div className="space-y-3">
                {preferredAnalysis.map((item: any, i: number) => (
                  <motion.div key={item.crop} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard className={`p-5 border-l-4 ${item.suitable ? "border-l-primary/60" : "border-l-destructive/60"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-foreground">{item.crop}</h4>
                            <StatusBadge variant={item.suitable ? "green" : "red"}>
                              {item.suitable ? <><CheckCircle2 className="h-3 w-3" /> Suitable</> : <><XCircle className="h-3 w-3" /> Not Suitable</>}
                            </StatusBadge>
                          </div>
                          <p className="text-xs font-medium mt-1 text-muted-foreground">{item.verdict}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                          <div className={`text-xl font-black tabular-nums ${(item.suitability_score || 0) >= 60 ? "text-primary" : (item.suitability_score || 0) >= 40 ? "text-amber-600" : "text-destructive"}`}>
                            {item.suitability_score || 0}
                          </div>
                        </div>
                      </div>

                      <ScoreBar score={item.suitability_score || 0} />

                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{item.analysis}</p>

                      {item.key_factors?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.key_factors.map((f: string, fi: number) => (
                            <span key={fi} className="text-[10px] font-medium bg-secondary/30 text-foreground px-2 py-0.5 rounded">{f}</span>
                          ))}
                        </div>
                      )}

                      {item.challenges?.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Challenges:</span>
                          <ul className="mt-1 space-y-0.5">
                            {item.challenges.map((c: string, ci: number) => (
                              <li key={ci} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0 mt-0.5" /> {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.tips && (
                        <p className="text-xs text-primary font-medium mt-2 bg-primary/5 rounded-lg p-2.5 flex items-start gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {item.tips}
                        </p>
                      )}

                      {!item.suitable && item.alternative && (
                        <div className="mt-3 pt-3 border-t border-border/20">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-primary">✅ Better Alternative: {item.alternative}</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">{item.alternative_reason}</p>
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {recommendedCrops.length === 0 && avoidCrops.length === 0 && preferredAnalysis.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Sprout className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No advisory data yet. Select a location above.</p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-right">AI-Powered Crop Advisory • Condition-based analysis • {selectedDistrict}, {selectedState}</p>
    </div>
  );
}
