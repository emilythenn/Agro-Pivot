import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Search, Filter, X } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useSettings } from "@/contexts/SettingsContext";
import { fetchMarketData } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendBadge = { up: "green" as const, down: "red" as const, stable: "accent" as const };

export default function MarketPage() {

  const { t, language } = useSettings();
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);

  const loadMarket = async () => {
    setLoading(true);
    try {
      const data = await fetchMarketData(language);
      setMarketData(data.commodities || data || []);
    } catch (e: any) {
      toast({ title: "Market load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMarket(); }, [language]);

  const filteredData = Array.isArray(marketData)
    ? marketData.filter((item: any) => {
        if (searchQuery) {
          return item.crop && item.crop.toLowerCase().includes(searchQuery.toLowerCase());
        }
        if (selectedCrops.length > 0) {
          return item.crop && selectedCrops.includes(item.crop);
        }
        return true;
      })
    : [];

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCrops([]);
  };
  const toggleCropFilter = (crop: string) => {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const parseVol = (v: string | undefined | null) => typeof v === "string" ? parseFloat(v.replace(/[^0-9.]/g, "")) || 0 : 0;
  const topGainer = [...filteredData].sort((a, b) => b.change - a.change)[0];
  const topLoser = [...filteredData].sort((a, b) => a.change - b.change)[0];
  const mostTraded = [...filteredData].sort((a, b) => parseVol(b.volume) - parseVol(a.volume))[0];

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-1">{t("market.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("market.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)} className={`gap-2 ${showFilter ? "bg-primary/10 border-primary/30" : ""}`}>
            <Filter className="h-3.5 w-3.5" /> Filter
          </Button>
          <Button variant="outline" size="sm" onClick={loadMarket} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Filter Panel */}
      {showFilter && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <GlassCard className="p-5 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search crops..."
                className="w-full bg-secondary/20 border border-border/40 rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Crop chips */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Select crops to view:</p>
              <div className="flex flex-wrap gap-2">
                {marketData.map((item) => (
                  <button
                    key={item.crop}
                    onClick={() => toggleCropFilter(item.crop)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedCrops.includes(item.crop)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/30 text-muted-foreground hover:bg-secondary/30"
                    }`}
                  >
                    {item.crop}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filters */}
            {(selectedCrops.length > 0 || searchQuery) && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Active:</span>
                {selectedCrops.map((crop) => (
                  <span key={crop} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
                    {crop}
                    <button onClick={() => toggleCropFilter(crop)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-[11px] text-destructive hover:underline ml-auto">
                  Clear all
                </button>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* Top Movers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t("market.topGainer"), crop: topGainer?.crop || "-", change: topGainer ? `+${topGainer.change}%` : "-", variant: "green" as const },
          { label: t("market.topLoser"), crop: topLoser?.crop || "-", change: topLoser ? `${topLoser.change}%` : "-", variant: "red" as const },
          { label: t("market.mostTraded"), crop: mostTraded?.crop || "-", change: mostTraded?.volume || "-", variant: "accent" as const },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">{item.label}</p>
              <p className="text-xl font-bold text-foreground">{item.crop}</p>
              <div className="mt-2"><StatusBadge variant={item.variant}>{item.change}</StatusBadge></div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Price Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {selectedCrops.length > 0 ? `Showing ${filteredData.length} of ${marketData.length} commodities` : "All Commodities"}
          </h3>
        </div>
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/20">
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("market.crop")}</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("market.price")}</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("market.change")}</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Week High</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Week Low</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden lg:table-cell">Volume</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                      No crops match your filter. Try selecting different crops.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item: any, i: number) => {
                    const Icon = trendIcon[item.trend as keyof typeof trendIcon] || Minus;
                    return (
                      <motion.tr
                        key={item.crop}
                        className="border-b border-border/20 hover:bg-secondary/15 transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.03 }}
                      >
                        <td className="p-4 font-semibold text-foreground">{item.crop}</td>
                        <td className="p-4 text-right tabular-nums font-semibold text-foreground">RM {item.price?.toLocaleString()}<span className="text-[10px] text-muted-foreground ml-0.5">/{item.unit}</span></td>
                        <td className="p-4 text-right">
                          <StatusBadge variant={trendBadge[item.trend as keyof typeof trendBadge] || "accent"}>
                            <Icon className="h-3 w-3" strokeWidth={1.5} /> {item.change > 0 ? "+" : ""}{item.change}%
                          </StatusBadge>
                        </td>
                        <td className="p-4 text-right tabular-nums text-muted-foreground hidden md:table-cell">RM {item.weekHigh?.toLocaleString()}</td>
                        <td className="p-4 text-right tabular-nums text-muted-foreground hidden md:table-cell">RM {item.weekLow?.toLocaleString()}</td>
                        <td className="p-4 text-right tabular-nums text-muted-foreground hidden lg:table-cell">{item.volume}</td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}