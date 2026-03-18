import { Cloud, CloudRain, Sun, Thermometer, Wind, Droplets } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { StatusBadge } from "./StatusBadge";
import { motion } from "framer-motion";

const weatherData = [
  { day: "Today", icon: CloudRain, temp: "28°C", rain: "85%", condition: "Heavy Rain" },
  { day: "Tue", icon: Cloud, temp: "30°C", rain: "60%", condition: "Cloudy" },
  { day: "Wed", icon: Sun, temp: "33°C", rain: "15%", condition: "Clear" },
  { day: "Thu", icon: Sun, temp: "34°C", rain: "10%", condition: "Clear" },
  { day: "Fri", icon: CloudRain, temp: "29°C", rain: "70%", condition: "Rain" },
  { day: "Sat", icon: Cloud, temp: "31°C", rain: "40%", condition: "Partly Cloudy" },
  { day: "Sun", icon: Sun, temp: "32°C", rain: "20%", condition: "Clear" },
];

export function WeatherTicker() {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            7-Day Forecast
          </span>
        </div>
        <StatusBadge variant="warning" pulse>Flood Warning Active</StatusBadge>
      </div>

      <div className="grid grid-cols-7 gap-2 min-w-0">
        {weatherData.map((day, i) => (
          <motion.div
            key={day.day}
            className="flex flex-col items-center gap-1.5 py-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <span className="text-xs text-muted-foreground">{day.day}</span>
            <day.icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium tabular-nums">{day.temp}</span>
            <div className="flex items-center gap-0.5">
              <Droplets className="h-3 w-3 text-accent/60" strokeWidth={1.5} />
              <span className="text-[10px] text-muted-foreground tabular-nums">{day.rain}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-destructive/70" strokeWidth={1.5} />
          <span>Avg: <span className="text-foreground tabular-nums">31°C</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5 text-accent/70" strokeWidth={1.5} />
          <span>Wind: <span className="text-foreground tabular-nums">12 km/h NE</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-accent/70" strokeWidth={1.5} />
          <span>Humidity: <span className="text-foreground tabular-nums">78%</span></span>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground/60">Source: MET Malaysia</span>
      </div>
    </GlassCard>
  );
}
