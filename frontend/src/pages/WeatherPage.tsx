import { supabase } from "@/integrations/supabase/client";
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
const weatherIcons: Record<string, any> = { "☀️": Sun, "🌤️": Sun, "⛅": Cloud, "🌥️": Cloud, "☁️": Cloud, "🌧️": CloudRain, "⛈️": CloudRain, "🌦️": CloudRain };

import { MALAYSIA_STATES, getDistrictsByState } from "@/lib/malaysiaRegions";

export default function WeatherPage() {
  const { user } = useAuth();
  const { language, t } = useSettings();
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  // Remove 'Kedah, Kedah' and only show selected district and state
  const [locationLabel, setLocationLabel] = useState("");
  const [selectedState, setSelectedState] = useState<string>("Kedah");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Kota Setar");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

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
    setSelectedState(state);
    setSelectedDistrict(district);
    return { district, state };
  };

  const loadWeather = async () => {
    setLoading(true);
    setError("");
    try {
      // Only load profile location on first load
      if (!user) {
        setSelectedState("Kedah");
        setSelectedDistrict("Kota Setar");
      } else {
        await loadProfileLocation();
      }
      const data = await fetchWeatherData(selectedState, selectedDistrict, selectedDate);
      setCurrent(data.current);
      setForecast(data.forecast || []);
      setAlerts(data.alerts || []);
    } catch (e: any) {
      if (e && typeof e === "object" && e.error) {
        setError(e.error + (e.availableStates ? `\nAvailable states: ${e.availableStates.join(", ")}` : "") + (e.availableDistricts ? `\nAvailable districts: ${e.availableDistricts.join(", ")}` : ""));
      } else {
        setError(e.message || "Failed to load weather data.");
      }
      toast({ title: "Weather load failed", description: e.error || e.message, variant: "destructive" });
      setCurrent(null);
      setForecast([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWeather(); }, [language, user?.id]);
  // Remove auto reload on state/district/date change

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Compute highest/lowest stats from forecast
  let tempHigh = null, tempLow = null, rainHigh = null, rainLow = null, windHigh = null, windLow = null, humidityHigh = null, humidityLow = null;
  if (forecast && forecast.length > 0) {
    tempHigh = Math.max(...forecast.map(d => d.temp_high));
    tempLow = Math.min(...forecast.map(d => d.temp_low));
    rainHigh = Math.max(...forecast.map(d => d.rain_percent));
    rainLow = Math.min(...forecast.map(d => d.rain_percent));
    windHigh = Math.max(...forecast.map(d => d.wind_kmh));
    windLow = Math.min(...forecast.map(d => d.wind_kmh));
    humidityHigh = Math.max(...forecast.map(d => d.humidity));
    humidityLow = Math.min(...forecast.map(d => d.humidity));
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
    {/* State/District/Date Selection with Set button */}
      <div className="flex gap-4 items-center mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedState}
            onChange={e => {
              setSelectedState(e.target.value);
              const districts = getDistrictsByState(e.target.value);
              setSelectedDistrict(districts[0] || "");
            }}
          >
            {MALAYSIA_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">District</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
          >
            {getDistrictsByState(selectedState).map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center mb-8">
          <Button variant="brown" size="sm" onClick={loadWeather} className="gap-2 mt-2">
            Set
          </Button>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-1">{t("weather.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("weather.subtitle")} • {selectedDistrict}{selectedDistrict && selectedState ? ', ' : ''}{selectedState && selectedDistrict !== selectedState ? selectedState : ''}</p>
        </div>
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
      {forecast && forecast.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: t("weather.temperature"),
              value: `${tempHigh}°C / ${tempLow}°C`,
              icon: Thermometer,
              sub: `Highest / Lowest temperature in 7-day forecast`,
              color: "text-destructive/70"
            },
            {
              label: t("weather.rainfall"),
              value: `${rainHigh}% / ${rainLow}%`,
              icon: Droplets,
              sub: `Highest / Lowest rain chance in 7-day forecast`,
              color: "text-accent"
            },
            {
              label: t("weather.wind"),
              value: `${windHigh} km/h / ${windLow} km/h`,
              icon: Wind,
              sub: `Highest / Lowest wind in 7-day forecast`,
              color: "text-accent/70"
            },
            {
              label: t("weather.humidity"),
              value: `${humidityHigh}% / ${humidityLow}%`,
              icon: Droplets,
              sub: `Highest / Lowest humidity in 7-day forecast`,
              color: "text-primary"
            },
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
            if (!day) return null;
            // Use normalized backend format
            const dateStr = day.date;
            const weatherDesc = day.condition || "";
            const iconCode = day.icon || "03d";
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                <GlassCard hoverable className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{dateStr}</p>
                    </div>
                    <img src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`} alt="icon" className="h-8 w-8" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{weatherDesc}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">High / Low</span><span className="font-semibold tabular-nums text-foreground">{Math.round(day.temp_high)}°C / {Math.round(day.temp_low)}°C</span></div>
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
