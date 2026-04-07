import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cloud, Sun, CloudRain, Loader2 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { fetchWeatherData } from "@/lib/api";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSettings } from "@/contexts/SettingsContext";

const weatherIconMap: Record<string, any> = {
  "☀️": Sun, "🌤️": Sun, "⛅": Cloud, "🌥️": Cloud, "☁️": Cloud, "🌧️": CloudRain, "⛈️": CloudRain, "🌦️": CloudRain,
};

export function WeatherTicker() {
  const { profile, loading: profileLoading } = useUserProfile();
  const { language } = useSettings();
  const [forecast, setForecast] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) return;
    setLoading(true);
    fetchWeatherData(profile.district, language)
      .then((data) => {
        setCurrent(data.current || null);
        setForecast(data.forecast || []);
        setAlerts(data.alerts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile.district, profileLoading, language]);

  if (loading || profileLoading) {
    return (
      <GlassCard className="p-4 flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </GlassCard>
    );
  }

  const hasHighAlert = alerts.some((a: any) => a.severity === "high");

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">7-Day Forecast — {profile.district}, {profile.state}</span>
        </div>
        {hasHighAlert && (
          <span className="text-[10px] text-warning font-medium px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20">
            ● {alerts.find((a: any) => a.severity === "high")?.type || "Weather Alert"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {forecast.slice(0, 7).map((day: any, i: number) => {
          const Icon = weatherIconMap[day.icon] || Cloud;
          return (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-1.5 py-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <span className="text-xs text-muted-foreground">{day.day}</span>
              <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
              <span className="text-sm font-semibold tabular-nums text-foreground">{day.temp_high || day.temp}°C</span>
              <span className="text-[10px] text-muted-foreground/70">💧 {day.rain_percent || day.rain}%</span>
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
        {current ? (
          <>
            <span>🌡️ Now: {current.temperature}°C</span>
            <span>💨 Wind: {current.wind_speed} km/h {current.wind_direction || ""}</span>
            <span>💧 Humidity: {current.humidity}%</span>
          </>
        ) : (
          <span>Weather data for {profile.district}</span>
        )}
        <span className="ml-auto text-muted-foreground/50">Source: MET Malaysia</span>
      </div>
    </GlassCard>
  );
}
