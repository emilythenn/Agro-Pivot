import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout, MapPin, Wheat, FlaskConical, DollarSign, Bell,
  ChevronRight, ChevronLeft, Loader2, LocateFixed, Check, SkipForward
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MALAYSIA_STATES, STATE_LIST } from "@/lib/malaysiaLocations";
import logoImg from "@/assets/logo.png";


const FARMER_STEPS: readonly Step[] = ["welcome", "farm", "crops", "environment", "economic", "notifications", "done"];
const SIMPLE_STEPS: readonly Step[] = ["welcome", "farm", "notifications", "done"];
type Step = "welcome" | "farm" | "crops" | "environment" | "economic" | "notifications" | "done";

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Determine role from user metadata
  const userRole = user?.user_metadata?.role || "farmer";
  const STEPS = userRole === "farmer" ? FARMER_STEPS : SIMPLE_STEPS;
  const [step, setStep] = useState<Step>("welcome");

  const [farm, setFarm] = useState({
    state: "", district: "", gps_lat: 0, gps_lng: 0,
    acreage: "", farm_type: "", irrigation_type: "", farm_name: "",
    location_address: "",
  });
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const locationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [crops, setCrops] = useState({
    current_crops: [] as string[], preferred_crops: [] as string[],
    primary_crop: "", secondary_crops: [] as string[],
    planting_season: "", farming_style: "", risk_tolerance: "",
  });

  const [environment, setEnvironment] = useState({
    soil_type: "", soil_ph: "", drainage_condition: "",
    flood_risk: "", historical_issues: [] as string[],
  });

  const [economic, setEconomic] = useState({
    budget_per_season: "", expected_yield_target: "",
    selling_method: "", main_crop_income: true,
  });

  const [notifications, setNotifications] = useState({
    email: true, inApp: true,
  });

  const districts = MALAYSIA_STATES[farm.state] || [];
  const stepIndex = STEPS.indexOf(step);

  const matchStateDistrict = (addressParts: Record<string, string>) => {
    const candidates = [addressParts.state, addressParts.county, addressParts.city, addressParts.town, addressParts.village, addressParts.suburb].filter(Boolean);
    let matchedState = "";
    let matchedDistrict = "";
    for (const stateName of STATE_LIST) {
      const stateNorm = stateName.toLowerCase().replace(/^w\.p\.\s*/, "");
      for (const c of candidates) {
        if (c.toLowerCase().includes(stateNorm) || stateNorm.includes(c.toLowerCase())) {
          matchedState = stateName;
          break;
        }
      }
      if (matchedState) break;
    }
    if (matchedState) {
      const dists = MALAYSIA_STATES[matchedState] || [];
      for (const dist of dists) {
        const distNorm = dist.toLowerCase();
        for (const c of candidates) {
          if (c.toLowerCase().includes(distNorm) || distNorm.includes(c.toLowerCase())) {
            matchedDistrict = dist;
            break;
          }
        }
        if (matchedDistrict) break;
      }
      if (!matchedDistrict) matchedDistrict = dists[0] || "";
    }
    return { matchedState, matchedDistrict };
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setFarm(f => ({ ...f, gps_lat: lat, gps_lng: lng }));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&addressdetails=1`);
        const data = await res.json();
        const updates: any = { gps_lat: lat, gps_lng: lng };
        if (data.display_name) updates.location_address = data.display_name;
        if (data.address) {
          const { matchedState, matchedDistrict } = matchStateDistrict(data.address);
          if (matchedState) { updates.state = matchedState; updates.district = matchedDistrict; }
        }
        setFarm(f => ({ ...f, ...updates }));
      } catch {}
      toast({ title: "📍 Location detected", description: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    } catch {
      toast({ title: "Location access denied", description: "You can enter your location manually.", variant: "destructive" });
    }
    setDetectingLocation(false);
  };

  const handleLocationSearch = (value: string) => {
    setFarm(f => ({ ...f, location_address: value }));
    if (locationTimeout.current) clearTimeout(locationTimeout.current);
    if (value.length < 3) { setLocationSuggestions([]); return; }
    locationTimeout.current = setTimeout(async () => {
      setSearchingLocation(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&countrycodes=my&format=json&limit=5&accept-language=en&addressdetails=1`);
        const data = await res.json();
        setLocationSuggestions(data || []);
      } catch { setLocationSuggestions([]); }
      setSearchingLocation(false);
    }, 400);
  };

  const selectLocationSuggestion = (suggestion: any) => {
    const updates: any = {
      location_address: suggestion.display_name,
      gps_lat: Number(suggestion.lat),
      gps_lng: Number(suggestion.lon),
    };
    if (suggestion.address) {
      const { matchedState, matchedDistrict } = matchStateDistrict(suggestion.address);
      if (matchedState) { updates.state = matchedState; updates.district = matchedDistrict; }
    }
    setFarm(f => ({ ...f, ...updates }));
    setLocationSuggestions([]);
  };

  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };
  const prev = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // First ensure profile row exists (upsert)
      const profileData: any = {
        id: user.id,
        state: farm.state || null, district: farm.district || null, gps_lat: farm.gps_lat || null,
        gps_lng: farm.gps_lng || null, acreage: Number(farm.acreage) || null,
        farm_type: farm.farm_type || null, irrigation_type: farm.irrigation_type || null,
        farm_name: farm.farm_name || null,
        primary_crop: crops.primary_crop || crops.current_crops[0] || null,
        secondary_crops: crops.secondary_crops.join(", ") || null,
        current_crops: crops.current_crops.join(", ") || null,
        preferred_crops: crops.preferred_crops.join(", ") || null,
        planting_season: crops.planting_season || null, farming_style: crops.farming_style || null,
        risk_tolerance: crops.risk_tolerance || null,
        soil_type: environment.soil_type || null,
        soil_ph: Number(environment.soil_ph) || null,
        drainage_condition: environment.drainage_condition || null,
        flood_risk: environment.flood_risk || null,
        historical_issues: environment.historical_issues.join(", ") || null,
        budget_per_season: Number(economic.budget_per_season) || null,
        expected_yield_target: economic.expected_yield_target || null,
        selling_method: economic.selling_method || null,
        main_crop_income: economic.main_crop_income,
        notification_email: notifications.email, notification_sms: false,
        onboarding_completed: true,
        full_name: user.user_metadata?.full_name || null,
        email: user.email || null,
        role: user.user_metadata?.role || "farmer",
      };

      const { error } = await supabase.from("profiles").upsert(profileData, { onConflict: "id" });

      if (error) {
        console.error("Onboarding save error:", error);
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      setStep("done");
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const defaultCropOptions = ["Padi", "Corn", "Chili", "Tomato", "Cucumber", "Ginger", "Mung Bean", "Soybean", "Tapioca", "Oil Palm", "Rubber", "Coconut", "Durian", "Banana"];
  const [customCrops, setCustomCrops] = useState<string[]>([]);
  const [newCropInput, setNewCropInput] = useState("");
  const cropOptions = [...defaultCropOptions, ...customCrops];

  const addCustomCrop = () => {
    const name = newCropInput.trim();
    if (!name || cropOptions.includes(name) || cropOptions.length >= 100) return;
    setCustomCrops(prev => [...prev, name]);
    setNewCropInput("");
  };
  const issueOptions = ["Drought", "Flood", "Pest infestation", "Disease", "Soil erosion", "None"];

  const toggleCrop = (list: string[], crop: string) =>
    list.includes(crop) ? list.filter(c => c !== crop) : [...list, crop];

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-6">
              <img src={logoImg} alt="Agro-Pivot" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Agro-Pivot! 🌾</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-2">
              Let's set up your farm profile for better AI predictions, weather alerts, and market recommendations.
            </p>
            <p className="text-xs text-muted-foreground/70">This takes about 2 minutes. You can skip and complete it later in Settings.</p>
          </div>
        );

      case "farm":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Farm Profile</h2>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Farm Name (optional)</label>
              <input value={farm.farm_name} onChange={e => setFarm({ ...farm, farm_name: e.target.value })}
                className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="e.g. Ladang Ahmad" />
            </div>

            {/* Auto-detect GPS */}
            <div>
              <button onClick={detectLocation} disabled={detectingLocation}
                className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-lg py-2.5 text-sm hover:bg-primary/20 transition-colors">
                {detectingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                {detectingLocation ? "Detecting..." : "Auto-detect My Location"}
              </button>
            </div>

            {/* Location address with search suggestions */}
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-1.5 block">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={farm.location_address}
                  onChange={(e) => handleLocationSearch(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Search or type your farm address..."
                />
                {searchingLocation && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {locationSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {locationSuggestions.map((s, i) => (
                    <button key={i} onClick={() => selectLocationSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 flex items-start gap-2">
                      <MapPin className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{s.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lat/Lng display */}
            {farm.gps_lat !== 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Latitude</label>
                  <input type="number" step="0.0001" value={farm.gps_lat} onChange={e => setFarm({ ...farm, gps_lat: Number(e.target.value) })}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Longitude</label>
                  <input type="number" step="0.0001" value={farm.gps_lng} onChange={e => setFarm({ ...farm, gps_lng: Number(e.target.value) })}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">State</label>
                <select value={farm.state} onChange={e => { setFarm({ ...farm, state: e.target.value, district: MALAYSIA_STATES[e.target.value]?.[0] || "" }); }}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  {STATE_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">District</label>
                <select value={farm.district} onChange={e => setFarm({ ...farm, district: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Farm Size (acres)</label>
                <input type="number" value={farm.acreage} onChange={e => setFarm({ ...farm, acreage: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="e.g. 12" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Farm Type</label>
                <select value={farm.farm_type} onChange={e => setFarm({ ...farm, farm_type: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="paddy">Paddy</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="mixed">Mixed</option>
                  <option value="fruits">Fruits</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Irrigation Type</label>
              <select value={farm.irrigation_type} onChange={e => setFarm({ ...farm, irrigation_type: e.target.value })}
                className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="rain_fed">Rain-fed</option>
                <option value="irrigation">Irrigation</option>
                <option value="drip">Drip</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
        );

      case "crops":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Wheat className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Crop & Preferences</h2>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Current Crops — select all crops that you currently have in your farm</label>
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setCrops({ ...crops, current_crops: crops.current_crops.length === cropOptions.length ? [] : [...cropOptions] })}
                  className="px-3 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  {crops.current_crops.length === cropOptions.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cropOptions.map(c => (
                  <button key={c} onClick={() => setCrops({ ...crops, current_crops: toggleCrop(crops.current_crops, c) })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      crops.current_crops.includes(c)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
              {/* Add custom crop */}
              <div className="flex gap-2 mt-2">
                <input value={newCropInput} onChange={e => setNewCropInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomCrop(); } }}
                  className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Add custom crop name..." maxLength={50} />
                <button type="button" onClick={addCustomCrop}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
                  + Add
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{crops.current_crops.length} selected · Up to 100 crop types</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Preferred Crops (optional) — select all crops that you plan to have in your farm</label>
              <div className="flex flex-wrap gap-2">
                {cropOptions.map(c => (
                  <button key={c} onClick={() => setCrops({ ...crops, preferred_crops: toggleCrop(crops.preferred_crops, c) })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      crops.preferred_crops.includes(c)
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
              {/* Add custom crop for preferred */}
              <div className="flex gap-2 mt-2">
                <input value={newCropInput} onChange={e => setNewCropInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomCrop(); } }}
                  className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Add custom crop name..." maxLength={50} />
                <button type="button" onClick={addCustomCrop}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
                  + Add
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{crops.preferred_crops.length} selected</p>
            </div>

            {/* Primary & Secondary Crop Selection */}
            {crops.current_crops.length > 0 && (
              <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-foreground">🌾 Select your Primary & Secondary crops from your active crops</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Primary Crop — your main focus crop</label>
                  <select value={crops.primary_crop} onChange={e => setCrops({ ...crops, primary_crop: e.target.value })}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option value="">— Select primary crop —</option>
                    {crops.current_crops.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Secondary Crops — other crops you grow alongside</label>
                  <div className="flex flex-wrap gap-2">
                    {crops.current_crops.filter(c => c !== crops.primary_crop).map(c => (
                      <button key={c} onClick={() => setCrops({ ...crops, secondary_crops: toggleCrop(crops.secondary_crops, c) })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          crops.secondary_crops.includes(c)
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{crops.secondary_crops.length} selected</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Planting Season</label>
              <select value={crops.planting_season} onChange={e => setCrops({ ...crops, planting_season: e.target.value })}
                className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="">— Select —</option>
                <option value="main_season">Main Season (Aug-Feb)</option>
                <option value="off_season">Off Season (Mar-Jul)</option>
                <option value="year_round">Year Round</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Farming Style</label>
                <select value={crops.farming_style} onChange={e => setCrops({ ...crops, farming_style: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="traditional">Traditional</option>
                  <option value="data_driven">Data-driven</option>
                  <option value="organic">Organic</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Risk Tolerance</label>
                <select value={crops.risk_tolerance} onChange={e => setCrops({ ...crops, risk_tolerance: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="low">Low (Stable crops)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Experimental)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "environment":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Soil & Environment</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2 mb-2">If unknown, just leave as "Unknown" — you can update later.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Soil Type</label>
                <select value={environment.soil_type} onChange={e => setEnvironment({ ...environment, soil_type: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="unknown">Unknown</option>
                  <option value="Clay">Clay</option>
                  <option value="Clay Loam">Clay Loam</option>
                  <option value="Loam">Loam</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Peat">Peat</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Soil pH (optional)</label>
                <input type="number" step="0.1" min="0" max="14" value={environment.soil_ph}
                  onChange={e => setEnvironment({ ...environment, soil_ph: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="e.g. 6.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Drainage</label>
                <select value={environment.drainage_condition} onChange={e => setEnvironment({ ...environment, drainage_condition: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="unknown">Unknown</option>
                  <option value="good">Good</option>
                  <option value="moderate">Moderate</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Flood Risk</label>
                <select value={environment.flood_risk} onChange={e => setEnvironment({ ...environment, flood_risk: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="unknown">Unknown</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Historical Issues</label>
              <div className="flex flex-wrap gap-2">
                {issueOptions.map(issue => (
                  <button key={issue} onClick={() => setEnvironment({ ...environment, historical_issues: toggleCrop(environment.historical_issues, issue) })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      environment.historical_issues.includes(issue)
                        ? "bg-destructive/20 text-destructive"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}>
                    {issue}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "economic":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Economic Profile</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2 mb-2">Helps AI optimize crop recommendations by cost & market value.</p>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Budget per Season (MYR)</label>
              <input type="number" value={economic.budget_per_season}
                onChange={e => setEconomic({ ...economic, budget_per_season: e.target.value })}
                className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="e.g. 5000" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Expected Yield Target (optional)</label>
              <input value={economic.expected_yield_target}
                onChange={e => setEconomic({ ...economic, expected_yield_target: e.target.value })}
                className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="e.g. 5 tonnes per acre" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Selling Method</label>
              <select value={economic.selling_method} onChange={e => setEconomic({ ...economic, selling_method: e.target.value })}
                className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="unknown">Not sure yet</option>
                <option value="middleman">Middleman</option>
                <option value="direct">Direct to consumer</option>
                <option value="market">Market / Pasar</option>
                <option value="contract">Contract farming</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-sm text-foreground font-medium">Main income from crops?</p>
                <p className="text-xs text-muted-foreground">Is farming your primary income source?</p>
              </div>
              <button onClick={() => setEconomic({ ...economic, main_crop_income: !economic.main_crop_income })}
                className={`w-12 h-6 rounded-full transition-colors relative ${economic.main_crop_income ? "bg-primary" : "bg-secondary"}`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${economic.main_crop_income ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2 mb-4">
              Allow Agro-Pivot to send you weather alerts, market price changes, and crop advisories.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm text-foreground font-medium">📧 Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive alerts to your registered email</p>
                </div>
                <button onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notifications.email ? "bg-primary" : "bg-secondary"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${notifications.email ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm text-foreground font-medium">🔔 In-App Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive alerts within the dashboard</p>
                </div>
                <button onClick={() => setNotifications({ ...notifications, inApp: !notifications.inApp })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notifications.inApp ? "bg-primary" : "bg-secondary"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${notifications.inApp ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          </div>
        );

      case "done":
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">You're All Set! 🎉</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Your farm profile is ready. Agro-Pivot will now give you personalized recommendations.
            </p>
            <button onClick={() => navigate("/dashboard", { replace: true })}
              className="bg-primary text-primary-foreground font-medium text-sm px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors">
              Go to Dashboard
            </button>
          </div>
        );
    }
  };

  const isFirstOrLast = step === "welcome" || step === "done";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Progress bar */}
        {!isFirstOrLast && (
          <div className="flex gap-1.5 mb-6">
            {STEPS.filter(s => s !== "welcome" && s !== "done").map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                STEPS.indexOf(s) <= stepIndex ? "bg-primary" : "bg-secondary"
              }`} />
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          {step !== "done" && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
              {step === "welcome" ? (
                <button onClick={async () => {
                    if (!user) return;
                    setSaving(true);
                    try {
                      const { error } = await supabase.from("profiles").upsert({
                        id: user.id,
                        onboarding_completed: true,
                        full_name: user.user_metadata?.full_name || null,
                        email: user.email || null,
                        role: user.user_metadata?.role || "farmer",
                      }, { onConflict: "id" });
                      if (error) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      } else {
                        toast({ title: "Onboarding skipped", description: "You can update your farm profile anytime in Settings." });
                        navigate("/dashboard/overview");
                      }
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    }
                    setSaving(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <SkipForward className="h-3 w-3" /> Skip for now
                </button>
              ) : (
                <button onClick={prev}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}

              {step === "notifications" ? (
                <button onClick={finish} disabled={saving}
                  className="flex items-center gap-2 bg-primary text-primary-foreground font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Finish Setup
                </button>
              ) : (
                <button onClick={next}
                  className="flex items-center gap-2 bg-primary text-primary-foreground font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
                  {step === "welcome" ? "Let's Go" : "Next"} <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Skip link for non-welcome steps */}
        {!isFirstOrLast && step !== "notifications" && (
          <p className="text-center mt-3">
            <button onClick={next} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Skip this step →
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
