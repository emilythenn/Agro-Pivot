import { Sprout, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, ChevronRight } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { StatusBadge } from "./StatusBadge";
import { motion } from "framer-motion";

interface CropRec {
  crop: string;
  action: string;
  climateRisk: "Low" | "Medium" | "High";
  marketTrend: "Rising" | "Falling" | "Stable";
  profitScore: number;
  advice: string;
}

const recommendations: CropRec[] = [
  {
    crop: "Ginger",
    action: "Execute Planting",
    climateRisk: "Low",
    marketTrend: "Rising",
    profitScore: 92,
    advice: "Optimal conditions detected. Price +12.1% this quarter. Low flood risk for next 30 days.",
  },
  {
    crop: "Mung Bean",
    action: "Execute Planting",
    climateRisk: "Low",
    marketTrend: "Rising",
    profitScore: 78,
    advice: "Short-cycle rescue crop. Ready in 60 days. Suitable as catch-up crop if primary batch fails.",
  },
  {
    crop: "Padi",
    action: "Monitor Closely",
    climateRisk: "Medium",
    marketTrend: "Rising",
    profitScore: 65,
    advice: "Flood warning active in Kedah. Delay planting by 7 days. Monitor MET forecasts daily.",
  },
  {
    crop: "Chili",
    action: "Avoid Planting",
    climateRisk: "High",
    marketTrend: "Falling",
    profitScore: 23,
    advice: "Heavy rainfall expected. Price declining -3.8%. High fungal disease risk in current conditions.",
  },
];

const riskBadge = (risk: string) => {
  if (risk === "Low") return <StatusBadge variant="green">Low Risk</StatusBadge>;
  if (risk === "Medium") return <StatusBadge variant="warning">Medium Risk</StatusBadge>;
  return <StatusBadge variant="red">High Risk</StatusBadge>;
};

export function CropRecommendations() {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">AI Crop Recommendations</h3>

      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.crop}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <GlassCard
              hoverable
              glowColor={rec.climateRisk === "High" ? "warning" : rec.profitScore > 75 ? "primary" : undefined}
              className="p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground">{rec.crop}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.advice}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {riskBadge(rec.climateRisk)}
                  {rec.marketTrend === "Rising" ? (
                    <StatusBadge variant="green"><TrendingUp className="h-3 w-3" strokeWidth={1.5} /> Rising</StatusBadge>
                  ) : rec.marketTrend === "Falling" ? (
                    <StatusBadge variant="red"><TrendingDown className="h-3 w-3" strokeWidth={1.5} /> Falling</StatusBadge>
                  ) : (
                    <StatusBadge variant="accent">Stable</StatusBadge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="flex items-center gap-4">
                  <div className="text-xs text-muted-foreground">
                    Profit Score:{" "}
                    <span className={`font-bold tabular-nums text-sm ${
                      rec.profitScore > 75 ? "text-primary" : rec.profitScore > 50 ? "text-warning" : "text-destructive"
                    }`}>
                      {rec.profitScore}/100
                    </span>
                  </div>
                </div>

                <button className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-4 py-2 transition-colors ${
                  rec.climateRisk === "High"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}>
                  {rec.climateRisk === "High" ? (
                    <><AlertTriangle className="h-3 w-3" strokeWidth={1.5} /> {rec.action}</>
                  ) : (
                    <><ShieldCheck className="h-3 w-3" strokeWidth={1.5} /> {rec.action} <ChevronRight className="h-3 w-3" strokeWidth={1.5} /></>
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
