import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, MapPin, Filter } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useSettings } from "@/contexts/SettingsContext";
import { fetchMarketPrices } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MALAYSIA_STATES, STATE_LIST } from "@/lib/malaysiaLocations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FarmContextBanner, profileToFarmContext } from "@/components/FarmContextBanner";
import { useAutoRefresh } from "@/hooks/useDataRefresh";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };

type MarketFilter = "all" | "your_crops" | "preferred" | "rising" | "falling";

export default function MarketPage() {
  const { t, language } = useSettings();
  const { profile, activeCrops, loading: profileLoading, version } = useUserProfile();
  const farmContext = profileToFarmContext(profile);
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [activeFilter, setActiveFilter] = useState<MarketFilter>("all");

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

  const loadMarket = useCallback(async (district?: string) => {
    const d = district || selectedDistrict || "Kuala Lumpur";
    setLoading(true);
    try {
      const data = await fetchMarketPrices(d, language, farmContext);
      setMarketData(data.prices || data.market_prices || []);
    } catch (e: any) {
      toast({ title: "Market data load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, language, farmContext]);

  useEffect(() => {
    if (selectedDistrict) loadMarket();
  }, [selectedDistrict, language]);

  useAutoRefresh(loadMarket, ["crops", "profiles"]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    const firstDistrict = MALAYSIA_STATES[state]?.[0] || state;
    setSelectedDistrict(firstDistrict);
  };

  const isUserCrop = (cropName: string) => activeCrops.some(c => cropName.toLowerCase().includes(c.toLowerCase()));
  const isPreferred = (cropName: string) => preferredCrops.some(c => cropName.toLowerCase().includes(c.toLowerCase()));

  const filteredMarket = marketData.filter(item => {
    const crop = item.crop || "";
    switch (activeFilter) {
      case "your_crops": return isUserCrop(crop);
      case "preferred": return isPreferred(crop);
      case "rising": return item.trend === "up";
      case "falling": return item.trend === "down";
      default: return true;
    }
  });

  const sortedMarket = [...filteredMarket].sort((a, b) => {
    const aUser = isUserCrop(a.crop || "");
    const bUser = isUserCrop(b.crop || "");
    if (aUser && !bUser) return -1;
    if (!aUser && bUser) return 1;
    return 0;
  });

  const rising = marketData.filter(m => m.trend === "up").length;
  const falling = marketData.filter(m => m.trend === "down").length;

  const filters: { key: MarketFilter; label: string; count?: number }[] = [
    { key: "all", label: "All Crops", count: marketData.length },
    { key: "your_crops", label: "Your Crops", count: marketData.filter(m => isUserCrop(m.crop || "")).length },
    { key: "preferred", label: "Preferred", count: marketData.filter(m => isPreferred(m.crop || "")).length },
    { key: "rising", label: "📈 Rising", count: rising },
    { key: "falling", label: "📉 Falling", count: falling },
  ];

  if (profileLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-1">Market Prices</h2>
          <p className="text-sm text-muted-foreground">Current crop market prices across Malaysia</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadMarket()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>

      <FarmContextBanner profile={profile} activeCrops={activeCrops} compact />

      {/* Location Selector */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-foreground">Location</span>
          <span className="text-[10px] text-muted-foreground/60 ml-2">(GPS → used only to fetch market data)</span>
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
          <p className="text-sm text-muted-foreground">Loading market prices...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-bold text-foreground">📊 Current Market Prices</h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
            Top 10–15 crops selected based on your farm conditions, active crops, climate suitability, and current market demand across Malaysia.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Crops", value: String(marketData.length), icon: BarChart3, color: "text-accent" },
              { label: "Rising", value: String(rising), icon: TrendingUp, color: "text-primary" },
              { label: "Falling", value: String(falling), icon: TrendingDown, color: "text-destructive" },
            ].map((item) => (
              <GlassCard key={item.label} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={1.5} />
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{item.value}</p>
              </GlassCard>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  activeFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {sortedMarket.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No crops match this filter.</p>
              <button onClick={() => setActiveFilter("all")} className="text-xs text-primary hover:underline mt-2">Show all</button>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {sortedMarket.map((item, i) => {
                const Icon = trendIcon[item.trend as keyof typeof trendIcon] || Minus;
                const isSignificant = Math.abs(item.change_percent || 0) > 8;
                const isMyCrop = isUserCrop(item.crop || "");
                const isPref = isPreferred(item.crop || "");
                return (
                  <motion.div key={item.crop} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <GlassCard hoverable className={`p-4 ${isSignificant ? "border-l-4 border-l-warning/60" : ""} ${isMyCrop ? "ring-1 ring-primary/20" : isPref ? "ring-1 ring-accent/20" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <h3 className="text-base font-bold text-foreground">{item.crop}</h3>
                            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider bg-secondary/30 px-2 py-0.5 rounded">{item.category}</span>
                            {isMyCrop && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">🌱 Your Crop</span>}
                            {isPref && !isMyCrop && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent">⭐ Preferred</span>}
                            {item.demand && <span className="text-[10px] text-muted-foreground bg-secondary/20 px-1.5 py-0.5 rounded">Demand: {item.demand}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold tabular-nums text-foreground">
                            RM {(item.price_rm || 0).toLocaleString()}<span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                          </p>
                          <div className="flex items-center gap-2 justify-end mt-0.5">
                            {item.prev_price_rm && <span className="text-[10px] text-muted-foreground/50 line-through tabular-nums">RM {item.prev_price_rm.toLocaleString()}</span>}
                            <StatusBadge variant={item.trend === "up" ? "green" : item.trend === "down" ? "red" : "accent"}>
                              <Icon className="h-3 w-3" /> {item.change_percent > 0 ? "+" : ""}{item.change_percent}%
                            </StatusBadge>
                          </div>
                        </div>
                      </div>
                      {(item.weekly_high || item.weekly_low) && (
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/20 text-xs text-muted-foreground">
                          <span>High: <span className="font-semibold tabular-nums text-foreground">RM {(item.weekly_high || 0).toLocaleString()}</span></span>
                          <span>Low: <span className="font-semibold tabular-nums text-foreground">RM {(item.weekly_low || 0).toLocaleString()}</span></span>
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-right">AI-Powered Market Data • {selectedDistrict}, {selectedState}</p>
    </div>
  );
}
