import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, CloudRain, TrendingUp, Sprout, Play, RotateCcw,
  CheckCircle, AlertTriangle, XCircle, Loader2, Camera, Pencil, Plus, X, MapPin, Globe, Home
} from "lucide-react";
import { FarmContextBanner, profileToFarmContext } from "@/components/FarmContextBanner";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { runSimulation } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLogger";
import { useUserProfile } from "@/hooks/useUserProfile";
import { MALAYSIA_STATES, STATE_LIST } from "@/lib/malaysiaLocations";

const presetCrops = [
  { id: "chili", name: "Chili", icon: "🌶️" },
  { id: "ginger", name: "Ginger", icon: "🫚" },
  { id: "cassava", name: "Cassava", icon: "🥔" },
  { id: "tapioca", name: "Tapioca", icon: "🥔" },
  { id: "padi", name: "Padi", icon: "🌾" },
  { id: "corn", name: "Corn", icon: "🌽" },
  { id: "cucumber", name: "Cucumber", icon: "🥒" },
  { id: "mung_bean", name: "Mung Bean", icon: "🫘" },
  { id: "oil_palm", name: "Oil Palm", icon: "🌴" },
  { id: "rubber", name: "Rubber", icon: "🌳" },
  { id: "durian", name: "Durian", icon: "🍈" },
  { id: "kangkung", name: "Kangkung", icon: "🥬" },
  { id: "tomato", name: "Tomato", icon: "🍅" },
  { id: "sweet_potato", name: "Sweet Potato", icon: "🍠" },
  { id: "pineapple", name: "Pineapple", icon: "🍍" },
  { id: "banana", name: "Banana", icon: "🍌" },
  { id: "watermelon", name: "Watermelon", icon: "🍉" },
  { id: "coconut", name: "Coconut", icon: "🥥" },
];

type WeatherScenario = "normal" | "more_rain" | "drought" | "monsoon_shift" | "flood" | "heatwave" | "la_nina" | "el_nino" | "auto";
type CropMode = "preset" | "custom" | "photo";
type SimMode = "your_farm" | "different_location";

const soilTypes = ["Unknown (Auto-detect)", "Clay Loam", "Sandy Loam", "Loam", "Peat", "Clay", "Sandy", "Laterite", "Alluvial"];

export default function SimulatorPage() {
  const { t, language } = useSettings();
  const { user } = useAuth();
  const { profile, activeCrops: userCrops, allCrops } = useUserProfile();
  const farmContext = profileToFarmContext(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  const [simMode, setSimMode] = useState<SimMode>("your_farm");
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [cropMode, setCropMode] = useState<CropMode>("preset");
  const [customInput, setCustomInput] = useState("");
  const [identifying, setIdentifying] = useState(false);

  // Results
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [assessment, setAssessment] = useState("");
  const [hasSimulated, setHasSimulated] = useState(false);

  // Different Location params
  const [simState, setSimState] = useState("Kedah");
  const [simDistrict, setSimDistrict] = useState("Kota Setar");
  const [simSoil, setSimSoil] = useState("Unknown (Auto-detect)");
  const [simAcreage, setSimAcreage] = useState("");
  const [simBudget, setSimBudget] = useState("");
  const [weather, setWeather] = useState<WeatherScenario>("auto");
  const [marketChange, setMarketChange] = useState(0);
  const [seedQuality, setSeedQuality] = useState(90);

  // Parse preferred crops from profile
  const preferredCrops = (profile.preferred_crops || "").split(",").map(c => c.trim()).filter(Boolean);
  const activeCropNames = userCrops;

  // Auto-select crops when mode changes
  useEffect(() => {
    if (simMode === "your_farm") {
      // Auto-select preferred crops
      setSelectedCrops(preferredCrops.length > 0 ? [...preferredCrops] : []);
    } else {
      // Auto-select active crops
      setSelectedCrops(activeCropNames.length > 0 ? [...activeCropNames] : []);
    }
    setHasSimulated(false);
    setResults([]);
    setAssessment("");
  }, [simMode]);

  const farmInfo = {
    location: `${profile.district || "—"}, ${profile.state || "—"}`,
    soilType: profile.soil_type || "Unknown",
    acreage: profile.acreage || 0,
    irrigation: profile.irrigation_type || "Unknown",
    floodRisk: profile.flood_risk || "Unknown",
    drainage: profile.drainage_condition || "Unknown",
    budget: profile.budget_per_season || 0,
    riskTolerance: profile.risk_tolerance || "medium",
    farmingStyle: profile.farming_style || "traditional",
  };

  const togglePresetCrop = (cropName: string) => {
    setSelectedCrops((prev) =>
      prev.includes(cropName) ? prev.filter((c) => c !== cropName) : [...prev, cropName]
    );
    setHasSimulated(false);
  };

  const addCustomCrop = () => {
    const name = customInput.trim();
    if (!name || selectedCrops.includes(name)) return;
    setSelectedCrops((prev) => [...prev, name]);
    setCustomInput("");
  };

  const removeCrop = (cropName: string) => {
    setSelectedCrops((prev) => prev.filter((c) => c !== cropName));
    setHasSimulated(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdentifying(true);
    try {
      let image_base64: string | undefined;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        image_base64 = await new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
      }
      const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${CLOUD_URL}/functions/v1/scan-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ crop_name: "unknown", image_base64, language, identify_only: true }),
      });
      if (!resp.ok) throw new Error("Identification failed");
      const result = await resp.json();
      const identified = result.crop_name;
      if (identified && identified !== "unknown" && !selectedCrops.includes(identified)) {
        setSelectedCrops((prev) => [...prev, identified]);
        toast({ title: `Crop identified: ${identified}`, description: "Added to your crop plan." });
      } else if (identified && selectedCrops.includes(identified)) {
        toast({ title: `${identified} already in plan`, description: "This crop is already selected." });
      }
    } catch (err: any) {
      toast({ title: "Identification failed", description: err.message, variant: "destructive" });
    } finally {
      setIdentifying(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSimulate = async () => {
    if (selectedCrops.length === 0) return;
    setLoading(true);
    try {
      let context = farmContext;
      let district = profile.district;
      let weatherVal: string = "normal";

      if (simMode === "different_location") {
        const actualSoil = simSoil === "Unknown (Auto-detect)" ? "auto-detect based on location" : simSoil;
        const actualAcreage = simAcreage ? Number(simAcreage) : undefined;
        const actualBudget = simBudget ? Number(simBudget) : undefined;
        context = {
          ...farmContext,
          state: simState,
          district: simDistrict,
          soil_type: actualSoil,
          acreage: actualAcreage ?? farmContext.acreage,
          budget_per_season: actualBudget ?? farmContext.budget_per_season,
        };
        district = simDistrict;
        weatherVal = weather === "auto" ? "auto-detect based on current conditions at location" : weather;
      }

      const data = await runSimulation({
        crops: selectedCrops,
        weather: simMode === "your_farm" ? "normal" : weatherVal,
        market_change: simMode === "your_farm" ? 0 : marketChange,
        seed_quality: simMode === "your_farm" ? 90 : seedQuality,
        district,
        language,
        farm_context: context,
      });
      setResults(data.results || []);
      setAssessment(data.overall_assessment || "");
      setHasSimulated(true);
      if (user) {
        await logActivity({
          userId: user.id,
          activityType: "simulation",
          title: `${simMode === "your_farm" ? "Farm" : "Alt"} Sim: ${selectedCrops.join(", ")}`,
          description: simMode === "your_farm" ? "Based on actual farm parameters" : `Location: ${simDistrict}, ${simState}`,
          metadata: { crops: selectedCrops, mode: simMode },
        });
      }
    } catch (e: any) {
      toast({ title: "Simulation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedCrops([]);
    setCropMode("preset");
    setCustomInput("");
    setWeather("auto");
    setMarketChange(0);
    setSeedQuality(90);
    setHasSimulated(false);
    setResults([]);
    setAssessment("");
  };

  const riskIcon = { green: CheckCircle, yellow: AlertTriangle, red: XCircle };
  const riskColor = { green: "text-primary", yellow: "text-warning", red: "text-destructive" };
  const riskBarColor = { green: "bg-primary", yellow: "bg-warning", red: "bg-destructive" };

  const ResultsBlock = ({ results, assessment }: { results: any[]; assessment: string }) => {
    const totalRevenue = results.reduce((s, r) => s + (r.expected_revenue || 0), 0);
    const avgRisk = results.length ? Math.round(results.reduce((s, r) => s + (r.failure_risk || 0), 0) / results.length) : 0;
    const overallLevel = avgRisk < 25 ? "green" : avgRisk < 50 ? "yellow" : "red";
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {assessment && (
          <GlassCard className="p-4">
            <p className="text-sm text-foreground/80 italic">"{assessment}"</p>
          </GlassCard>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassCard className="p-4">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t("simulator.totalRevenue")}</p>
            <p className="text-xl font-bold tabular-nums text-foreground">RM {totalRevenue.toLocaleString()}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t("simulator.avgFailureRisk")}</p>
            <div className="flex items-center gap-2">
              {(() => { const Icon = riskIcon[overallLevel as keyof typeof riskIcon]; return <Icon className={`h-5 w-5 ${riskColor[overallLevel as keyof typeof riskColor]}`} />; })()}
              <p className="text-xl font-bold tabular-nums text-foreground">{avgRisk}%</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t("simulator.cropsPlanned")}</p>
            <p className="text-xl font-bold tabular-nums text-foreground">{results.length}</p>
          </GlassCard>
        </div>
        <div className="space-y-3">
          {results.map((result: any, i: number) => {
            const rLevel = result.risk_level || (result.failure_risk < 25 ? "green" : result.failure_risk < 50 ? "yellow" : "red");
            const crop = presetCrops.find((c) => c.name === result.crop_name);
            return (
              <motion.div key={result.crop_name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{crop?.icon || "🌱"}</span>
                      <div>
                        <h4 className="text-base font-bold text-foreground">{result.crop_name}</h4>
                        {result.advice && <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{result.advice}</p>}
                      </div>
                    </div>
                    <StatusBadge variant={rLevel === "green" ? "green" : rLevel === "yellow" ? "warning" : "red"}>
                      {rLevel === "green" ? t("simulator.profitable") : rLevel === "yellow" ? t("simulator.moderateRiskLabel") : t("simulator.highRiskLabel")}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">{t("simulator.estYield")}</span>
                      <span className="font-semibold text-foreground">{result.estimated_yield} ton/ha</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">{t("simulator.estRevenue")}</span>
                      <span className="font-semibold tabular-nums text-foreground">RM {result.expected_revenue?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Est. Profit</span>
                      <span className="font-semibold tabular-nums text-foreground">RM {(result.estimated_profit || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">{t("simulator.failureRisk")}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-2 bg-secondary/40 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${riskBarColor[rLevel as keyof typeof riskBarColor] || "bg-warning"}`} style={{ width: `${result.failure_risk}%` }} />
                        </div>
                        <span className="font-bold tabular-nums text-foreground">{result.failure_risk}%</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // Crop selection section for both modes
  const CropSelectionSection = () => {
    const autoLabel = simMode === "your_farm" ? "Preferred Crops" : "Active Crops";
    const autoCrops = simMode === "your_farm" ? preferredCrops : activeCropNames;
    const autoHint = simMode === "your_farm"
      ? "Optional — select all crops you plan to have in your farm"
      : "Select all current active crops in your farm";

    const otherCrops = presetCrops.filter(crop => !autoCrops.some(ac => ac.toLowerCase() === crop.name.toLowerCase()));

    const selectAllAuto = () => {
      const newCrops = [...selectedCrops];
      autoCrops.forEach(c => { if (!newCrops.some(s => s.toLowerCase() === c.toLowerCase())) newCrops.push(c); });
      setSelectedCrops(newCrops);
      setHasSimulated(false);
    };

    const selectAllOther = () => {
      const newCrops = [...selectedCrops];
      otherCrops.forEach(c => { if (!newCrops.includes(c.name)) newCrops.push(c.name); });
      setSelectedCrops(newCrops);
      setHasSimulated(false);
    };

    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sprout className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">{t("simulator.selectCrops")}</h3>
          {autoCrops.length > 0 && (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              {autoCrops.length} {autoLabel.toLowerCase()} auto-selected
            </span>
          )}
        </div>

        {/* Auto-selected crops */}
        {autoCrops.length > 0 && cropMode === "preset" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">🌱 {autoLabel}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{autoHint}</p>
              </div>
              <button onClick={selectAllAuto} className="text-[10px] font-medium text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded-md transition-colors">
                Select All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
              {autoCrops.map((cropName) => {
                const selected = selectedCrops.some(c => c.toLowerCase() === cropName.toLowerCase());
                const preset = presetCrops.find(c => c.name.toLowerCase() === cropName.toLowerCase());
                return (
                  <button key={cropName} onClick={() => togglePresetCrop(cropName)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-primary/30 bg-primary/5 hover:border-primary/60"
                    }`}>
                    <span className="text-xl">{preset?.icon || "🌱"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{cropName}</p>
                      <p className="text-[10px] text-primary">{simMode === "your_farm" ? "Preferred" : "Active"}</p>
                    </div>
                    {selected && <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border/30 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📊 Other Crop Suggestions</p>
                <button onClick={selectAllOther} className="text-[10px] font-medium text-muted-foreground hover:text-primary bg-secondary/50 px-2 py-1 rounded-md transition-colors">
                  Select All
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {([
            { mode: "preset" as const, label: t("simulator.cropPreset"), icon: Sprout },
            { mode: "custom" as const, label: t("simulator.cropCustom"), icon: Pencil },
            { mode: "photo" as const, label: t("simulator.cropPhoto"), icon: Camera },
          ]).map(opt => (
            <button key={opt.mode} onClick={() => setCropMode(opt.mode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                cropMode === opt.mode ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border/40 text-muted-foreground hover:bg-secondary/30"
              }`}>
              <opt.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {opt.label}
            </button>
          ))}
        </div>

        {cropMode === "preset" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {presetCrops
              .filter(crop => !autoCrops.some(ac => ac.toLowerCase() === crop.name.toLowerCase()))
              .map((crop) => {
                const selected = selectedCrops.includes(crop.name);
                return (
                  <button key={crop.id} onClick={() => togglePresetCrop(crop.name)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40"
                    }`}>
                    <span className="text-xl">{crop.icon}</span>
                    <p className="text-sm font-medium text-foreground">{crop.name}</p>
                    {selected && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
                  </button>
                );
              })}
          </div>
        )}

        {cropMode === "custom" && (
          <div className="flex gap-2">
            <input value={customInput} onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomCrop()}
              placeholder="e.g. Dragon Fruit, Lemongrass, Starfruit..."
              className="flex-1 bg-secondary/20 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
            <Button onClick={addCustomCrop} disabled={!customInput.trim()} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("simulator.addCustomCrop")}
            </Button>
          </div>
        )}

        {cropMode === "photo" && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            <button onClick={() => !identifying && fileRef.current?.click()} disabled={identifying}
              className="w-full flex items-center justify-center gap-3 p-6 border-2 border-dashed border-border/50 rounded-xl hover:border-primary/30 transition-colors group">
              {identifying ? (
                <><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="text-sm text-muted-foreground">{t("simulator.identifyingCrop")}</span></>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Camera className="h-6 w-6 text-accent" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{t("simulator.cropPhoto")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("simulator.cropPhotoDesc")}</p>
                  </div>
                </>
              )}
            </button>
          </div>
        )}

        {selectedCrops.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
            <span className="text-xs text-muted-foreground self-center mr-1">{t("simulator.cropsPlanned")}:</span>
            {selectedCrops.map((name) => {
              const preset = presetCrops.find((c) => c.name === name);
              const isAuto = autoCrops.some(ac => ac.toLowerCase() === name.toLowerCase());
              return (
                <span key={name} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  isAuto ? "bg-primary/15 text-primary border-primary/30" : "bg-primary/10 text-primary border-primary/20"
                }`}>
                  {preset?.icon && <span>{preset.icon}</span>}
                  {name}
                  {isAuto && <span className="text-[9px] opacity-70">({simMode === "your_farm" ? "preferred" : "active"})</span>}
                  <button onClick={() => removeCrop(name)} className="ml-0.5 hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </GlassCard>
    );
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      <FarmContextBanner profile={profile} activeCrops={userCrops} compact />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold font-serif text-foreground mb-4">{t("simulator.title")}</h2>
      </motion.div>

      {/* Mode Toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => setSimMode("your_farm")}
          className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
            simMode === "your_farm"
              ? "border-primary bg-primary/10 shadow-md"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <Home className={`h-5 w-5 ${simMode === "your_farm" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
          <div className="text-left">
            <p className={`text-sm font-bold ${simMode === "your_farm" ? "text-primary" : "text-foreground"}`}>🏠 Your Farm</p>
            <p className="text-[10px] text-muted-foreground">Simulate using your actual farm data</p>
          </div>
          {simMode === "your_farm" && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
        </button>
        <button
          onClick={() => setSimMode("different_location")}
          className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
            simMode === "different_location"
              ? "border-accent bg-accent/10 shadow-md"
              : "border-border bg-card hover:border-accent/40"
          }`}
        >
          <Globe className={`h-5 w-5 ${simMode === "different_location" ? "text-accent" : "text-muted-foreground"}`} strokeWidth={1.5} />
          <div className="text-left">
            <p className={`text-sm font-bold ${simMode === "different_location" ? "text-accent" : "text-foreground"}`}>🌍 Different Location</p>
            <p className="text-[10px] text-muted-foreground">What if you farmed somewhere else?</p>
          </div>
          {simMode === "different_location" && <CheckCircle className="h-4 w-4 text-accent ml-auto" />}
        </button>
      </div>

      {/* Crop Selection */}
      <CropSelectionSection />

      {/* YOUR FARM MODE */}
      <AnimatePresence mode="wait">
        {simMode === "your_farm" && selectedCrops.length > 0 && (
          <motion.div key="farm" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <GlassCard className="p-6 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Home className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="text-base font-bold text-foreground">Farm Parameters</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Auto-synced</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">All parameters are synced from your profile automatically.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Location", value: farmInfo.location },
                  { label: "Soil Type", value: farmInfo.soilType },
                  { label: "Farm Size", value: farmInfo.acreage ? `${farmInfo.acreage} acres` : "—" },
                  { label: "Irrigation", value: farmInfo.irrigation },
                  { label: "Flood Risk", value: farmInfo.floodRisk },
                  { label: "Drainage", value: farmInfo.drainage },
                  { label: "Budget/Season", value: farmInfo.budget ? `RM ${farmInfo.budget.toLocaleString()}` : "—" },
                  { label: "Risk Tolerance", value: farmInfo.riskTolerance },
                ].map(p => (
                  <div key={p.label} className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{p.label}</p>
                    <p className="text-sm font-semibold text-foreground capitalize">{p.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSimulate} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {loading ? "Simulating..." : "Run Simulation"}
                </Button>
                {hasSimulated && (
                  <Button variant="outline" size="sm" onClick={() => { setHasSimulated(false); setResults([]); setAssessment(""); }}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </GlassCard>

            {hasSimulated && results.length > 0 && (
              <ResultsBlock results={results} assessment={assessment} />
            )}
          </motion.div>
        )}

        {/* DIFFERENT LOCATION MODE */}
        {simMode === "different_location" && selectedCrops.length > 0 && (
          <motion.div key="alt" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <GlassCard className="p-6 border-accent/20">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-5 w-5 text-accent" strokeWidth={1.5} />
                <h3 className="text-base font-bold text-foreground">Location & Farm Parameters</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-5">Choose a location — soil, weather, and farm size will be auto-estimated by AI if set to unknown.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Select value={simState} onValueChange={(v) => { setSimState(v); setSimDistrict(MALAYSIA_STATES[v]?.[0] || ""); }}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATE_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">District</Label>
                  <Select value={simDistrict} onValueChange={setSimDistrict}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(MALAYSIA_STATES[simState] || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Soil Type</Label>
                  <Select value={simSoil} onValueChange={setSimSoil}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {soilTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Farm Size (acres) — leave blank for AI estimate</Label>
                  <Input type="number" value={simAcreage} onChange={e => setSimAcreage(e.target.value)} placeholder="Auto-estimate" min={0.1} step={0.5} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Budget per Season (RM) — leave blank for AI estimate</Label>
                  <Input type="number" value={simBudget} onChange={e => setSimBudget(e.target.value)} placeholder="Auto-estimate" min={100} step={500} />
                </div>
              </div>

              {/* Weather & Market scenarios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CloudRain className="h-3.5 w-3.5" /> Weather Scenario
                  </Label>
                  <Select value={weather} onValueChange={(v) => setWeather(v as WeatherScenario)}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">🤖 Auto-detect (AI estimates)</SelectItem>
                      <SelectItem value="normal">{t("simulator.weatherNormal")}</SelectItem>
                      <SelectItem value="more_rain">{t("simulator.weatherMoreRain")}</SelectItem>
                      <SelectItem value="drought">{t("simulator.weatherDrought")}</SelectItem>
                      <SelectItem value="monsoon_shift">{t("simulator.weatherMonsoon")}</SelectItem>
                      <SelectItem value="flood">{t("simulator.weatherFlood")}</SelectItem>
                      <SelectItem value="heatwave">{t("simulator.weatherHeatwave")}</SelectItem>
                      <SelectItem value="la_nina">{t("simulator.weatherLaNina")}</SelectItem>
                      <SelectItem value="el_nino">{t("simulator.weatherElNino")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> {t("simulator.marketFluctuation")}
                  </Label>
                  <Slider value={[marketChange]} onValueChange={(v) => setMarketChange(v[0])} min={-30} max={30} step={5} className="mt-3" />
                  <p className="text-xs text-center font-medium text-foreground tabular-nums">{marketChange > 0 ? "+" : ""}{marketChange}%</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sprout className="h-3.5 w-3.5" /> {t("simulator.seedQuality")}
                  </Label>
                  <Slider value={[seedQuality]} onValueChange={(v) => setSeedQuality(v[0])} min={50} max={100} step={5} className="mt-3" />
                  <p className="text-xs text-center font-medium text-foreground tabular-nums">{seedQuality}%</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSimulate} disabled={loading} className="gap-2 border-accent/30 hover:bg-accent/5">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {loading ? "Simulating..." : "Run What-If Simulation"}
                </Button>
                {hasSimulated && (
                  <Button variant="ghost" size="sm" onClick={() => { setHasSimulated(false); setResults([]); setAssessment(""); }}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </GlassCard>

            {hasSimulated && results.length > 0 && (
              <ResultsBlock results={results} assessment={assessment} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Reset */}
      {selectedCrops.length > 0 && hasSimulated && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset All
          </Button>
        </div>
      )}
    </div>
  );
}
