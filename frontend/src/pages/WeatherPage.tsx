import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cloud, Droplets, Thermometer, Wind, CloudRain, Sun, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useSettings } from "@/contexts/SettingsContext";
import { fetchWeatherData } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const weatherIcons: Record<string, any> = { "☀️": Sun, "🌤️": Sun, "⛅": Cloud, "🌥️": Cloud, "☁️": Cloud, "🌧️": CloudRain, "⛈️": CloudRain, "🌦️": CloudRain };

export default function WeatherPage() {
  const { t, language } = useSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [locationLabel, setLocationLabel] = useState("Kota Setar, Kedah");

  const loadProfileLocation = async () => {
    if (!user) return { district: "Kota Setar", state: "Kedah" };
    const { data } = await supabase
      .from("profiles")
      .select("district, state")
      .eq("id", user.id)
      .single();

    const district = data?.district || "Kota Setar";
    const state = data?.state || "Kedah";
    setLocationLabel(`${district}, ${state}`);
    return { district, state };
  };

  const loadWeather = async () => {
    setLoading(true);
    try {
      const { district } = await loadProfileLocation();
      const data = await fetchWeatherData(district, language);
      setCurrent(data.current);
      setForecast(data.forecast || []);
      setAlerts(data.alerts || []);
    } catch (e: any) {
      toast({ title: "Weather load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWeather(); }, [language, user?.id]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-1">{t("weather.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("weather.subtitle")} • {locationLabel}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadWeather} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>

      {/* Alert Banners */}
      {alerts.map((alert: any, i: number) => (
        <GlassCard key={i} glowColor="warning" className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{alert.type}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
          </div>
          <StatusBadge variant={alert.severity === "high" ? "red" : "warning"} pulse>{alert.severity}</StatusBadge>
        </GlassCard>
      ))}

      {/* Current Stats */}
      {current && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t("weather.temperature"), value: `${current.temperature}°C`, icon: Thermometer, sub: `Feels like ${current.feels_like}°C`, color: "text-destructive/70" },
            { label: t("weather.rainfall"), value: `${current.rainfall_mm}mm`, icon: Droplets, sub: current.condition, color: "text-accent" },
            { label: t("weather.wind"), value: `${current.wind_speed} km/h`, icon: Wind, sub: current.wind_direction, color: "text-accent/70" },
            { label: t("weather.humidity"), value: `${current.humidity}%`, icon: Droplets, sub: current.humidity > 80 ? "Very High" : "Normal", color: "text-primary" },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={1.5} />
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{item.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* 7 Day Forecast Cards */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">7-Day Forecast</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {forecast.map((day: any, i: number) => {
            const IconComp = weatherIcons[day.icon] || Cloud;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                <GlassCard hoverable className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{day.day}</p>
                      <p className="text-[10px] text-muted-foreground">{day.date}</p>
                    </div>
                    <IconComp className="h-6 w-6 text-accent" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{day.condition}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">High / Low</span><span className="font-semibold tabular-nums text-foreground">{day.temp_high}°C / {day.temp_low}°C</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rain</span><span className={`font-semibold tabular-nums ${day.rain_percent > 60 ? "text-accent" : "text-foreground"}`}>{day.rain_percent}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Wind</span><span className="font-semibold tabular-nums text-foreground">{day.wind_kmh} km/h</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Humidity</span><span className="font-semibold tabular-nums text-foreground">{day.humidity}%</span></div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>


      <p className="text-[10px] text-muted-foreground/50 text-right">AI-Generated Weather Intelligence • Updated just now</p>
    </div>
  );
}
