import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerDataRefresh, useAutoRefresh } from "@/hooks/useDataRefresh";
import { Sprout, Plus, Loader2, Calendar, Droplets, DollarSign, Eye, Trash2, ChevronRight, ChevronLeft, MapPin, FlaskConical, AlertTriangle, X, Pencil } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CROP_OPTIONS = [
  "Padi", "Corn", "Chili", "Ginger", "Cassava/Tapioca", "Oil Palm", "Rubber",
  "Durian", "Coconut", "Banana", "Kangkung", "Mung Bean", "Sweet Potato",
  "Pineapple", "Watermelon", "Cucumber", "Tomato", "Eggplant", "Okra",
];

const GROWTH_STAGES = ["seedling", "vegetative", "flowering", "fruiting", "harvest"];

interface ActiveCrop {
  id: string;
  crop_name: string;
  crop_variety: string | null;
  planting_date: string | null;
  expected_harvest_date: string | null;
  plot_name: string | null;
  plot_size: number | null;
  water_source: string;
  soil_condition: string | null;
  drainage_condition: string | null;
  current_season: string;
  seed_source: string | null;
  seed_cost: number | null;
  total_budget: number | null;
  fertilizer_plan: string | null;
  labor_cost: number | null;
  ai_monitoring: boolean;
  growth_stage: string;
  priority_goal: string;
  risk_tolerance: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const defaultForm = {
  crop_name: "",
  crop_variety: "",
  planting_date: "",
  expected_harvest_date: "",
  plot_name: "",
  plot_size: "",
  water_source: "rain-fed",
  soil_condition: "",
  drainage_condition: "",
  current_season: "wet",
  seed_source: "",
  seed_cost: "",
  total_budget: "",
  fertilizer_plan: "",
  labor_cost: "",
  ai_monitoring: false,
  growth_stage: "seedling",
  priority_goal: "max_profit",
  risk_tolerance: "medium",
  notes: "",
};

export default function ActiveCropsPage() {
  const { user } = useAuth();
  const { profile, activeCrops, loading: profileLoading } = useUserProfile();
  const [crops, setCrops] = useState<ActiveCrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [viewCrop, setViewCrop] = useState<ActiveCrop | null>(null);
  const [editCrop, setEditCrop] = useState<ActiveCrop | null>(null);
  const [customCrop, setCustomCrop] = useState("");
  const [plannedCrops, setPlannedCrops] = useState<string[]>([]);
  const [showAddPlanned, setShowAddPlanned] = useState(false);
  const [plannedInput, setPlannedInput] = useState("");
  const [plannedCustom, setPlannedCustom] = useState("");
  const [savingPlanned, setSavingPlanned] = useState(false);

  const loadCrops = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("active_crops" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Load crops error:", error);
    }
    const loadedCrops = (data as any[]) || [];

    // Auto-seed from profile crops if active_crops table is empty
    if (loadedCrops.length === 0 && activeCrops.length > 0 && user) {
      const inserts = activeCrops.map(cropName => ({
        user_id: user.id,
        crop_name: cropName,
        water_source: profile.irrigation_type || "rain-fed",
        soil_condition: profile.soil_type || null,
        drainage_condition: profile.drainage_condition || null,
        current_season: profile.planting_season === "off_season" ? "dry" : "wet",
        risk_tolerance: profile.risk_tolerance || "medium",
        priority_goal: "max_profit",
        growth_stage: "seedling",
        ai_monitoring: true,
      }));
      const { data: seeded, error: seedErr } = await supabase
        .from("active_crops" as any)
        .insert(inserts as any)
        .select();
      if (seedErr) {
        console.error("Auto-seed error:", seedErr);
        setCrops([]);
      } else {
        setCrops((seeded as any[]) || []);
      }
    } else {
      setCrops(loadedCrops);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && !profileLoading) loadCrops();
  }, [user, profileLoading]);

  // Load planned crops from profile
  useEffect(() => {
    if (profile.preferred_crops) {
      setPlannedCrops(profile.preferred_crops.split(",").map(c => c.trim()).filter(Boolean));
    } else {
      setPlannedCrops([]);
    }
  }, [profile.preferred_crops]);

  const addPlannedCrop = async () => {
    const cropName = plannedInput === "__custom" ? plannedCustom.trim() : plannedInput;
    if (!cropName || !user) return;
    if (plannedCrops.includes(cropName)) {
      toast({ title: "Already in your planned list", variant: "destructive" });
      return;
    }
    setSavingPlanned(true);
    const updated = [...plannedCrops, cropName].join(", ");
    const { error } = await supabase.from("profiles").update({ preferred_crops: updated }).eq("id", user.id);
    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      setPlannedCrops(prev => [...prev, cropName]);
      toast({ title: `${cropName} added to planned crops!` });
      setShowAddPlanned(false);
      setPlannedInput("");
      setPlannedCustom("");
      triggerDataRefresh("profiles");
      window.dispatchEvent(new CustomEvent("profile-updated"));
    }
    setSavingPlanned(false);
  };

  const removePlannedCrop = async (cropName: string) => {
    if (!user) return;
    const updated = plannedCrops.filter(c => c !== cropName).join(", ");
    const { error } = await supabase.from("profiles").update({ preferred_crops: updated || null }).eq("id", user.id);
    if (error) {
      toast({ title: "Failed to remove", variant: "destructive" });
    } else {
      setPlannedCrops(prev => prev.filter(c => c !== cropName));
      toast({ title: `${cropName} removed from planned crops` });
      triggerDataRefresh("profiles");
      window.dispatchEvent(new CustomEvent("profile-updated"));
    }
  };

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const cropName = form.crop_name === "__custom" ? customCrop.trim() : form.crop_name;
    if (!user || !cropName) {
      toast({ title: "Please select a crop", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      crop_name: cropName,
      crop_variety: form.crop_variety || null,
      planting_date: form.planting_date || null,
      expected_harvest_date: form.expected_harvest_date || null,
      plot_name: form.plot_name || null,
      plot_size: form.plot_size ? Number(form.plot_size) : null,
      water_source: form.water_source,
      soil_condition: form.soil_condition || profile.soil_type || null,
      drainage_condition: form.drainage_condition || profile.drainage_condition || null,
      current_season: form.current_season,
      seed_source: form.seed_source || null,
      seed_cost: form.seed_cost ? Number(form.seed_cost) : null,
      total_budget: form.total_budget ? Number(form.total_budget) : null,
      fertilizer_plan: form.fertilizer_plan || null,
      labor_cost: form.labor_cost ? Number(form.labor_cost) : null,
      ai_monitoring: form.ai_monitoring,
      growth_stage: form.growth_stage,
      priority_goal: form.priority_goal,
      risk_tolerance: form.risk_tolerance,
      notes: form.notes || null,
    };

    const { error } = await supabase.from("active_crops" as any).insert(payload as any);
    if (error) {
      toast({ title: "Failed to add crop", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${cropName} added successfully!` });
      setShowAdd(false);
      setForm(defaultForm);
      setStep(1);
      loadCrops();
      triggerDataRefresh("crops", "activity");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("active_crops" as any).update({ status: "removed" } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Crop removed" });
      loadCrops();
      triggerDataRefresh("crops", "activity");
    }
  };

  const daysUntilHarvest = (date: string | null) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysSincePlanting = (date: string | null) => {
    if (!date) return null;
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  const getRiskLevel = (crop: ActiveCrop): "low" | "medium" | "high" => {
    if (crop.risk_tolerance === "high") return "high";
    if (crop.drainage_condition === "poor" || crop.water_source === "rain-fed") return "medium";
    return "low";
  };

  const riskColors: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: "bg-primary/10", text: "text-primary", label: "🟢 Low Risk" },
    medium: { bg: "bg-warning/10", text: "text-warning", label: "🟡 Medium Risk" },
    high: { bg: "bg-destructive/10", text: "text-destructive", label: "🔴 High Risk" },
  };

  const openEdit = (crop: ActiveCrop) => {
    const isCustom = !CROP_OPTIONS.includes(crop.crop_name);
    setForm({
      crop_name: isCustom ? "__custom" : crop.crop_name,
      crop_variety: crop.crop_variety || "",
      planting_date: crop.planting_date || "",
      expected_harvest_date: crop.expected_harvest_date || "",
      plot_name: crop.plot_name || "",
      plot_size: crop.plot_size ? String(crop.plot_size) : "",
      water_source: crop.water_source || "rain-fed",
      soil_condition: crop.soil_condition || "",
      drainage_condition: crop.drainage_condition || "",
      current_season: crop.current_season || "wet",
      seed_source: crop.seed_source || "",
      seed_cost: crop.seed_cost ? String(crop.seed_cost) : "",
      total_budget: crop.total_budget ? String(crop.total_budget) : "",
      fertilizer_plan: crop.fertilizer_plan || "",
      labor_cost: crop.labor_cost ? String(crop.labor_cost) : "",
      ai_monitoring: crop.ai_monitoring,
      growth_stage: crop.growth_stage,
      priority_goal: crop.priority_goal,
      risk_tolerance: crop.risk_tolerance,
      notes: crop.notes || "",
    });
    setCustomCrop(isCustom ? crop.crop_name : "");
    setEditCrop(crop);
    setStep(1);
    setShowAdd(true);
  };

  const handleUpdate = async () => {
    const cropName = form.crop_name === "__custom" ? customCrop.trim() : form.crop_name;
    if (!user || !editCrop || !cropName) return;
    setSaving(true);
    const payload = {
      crop_name: cropName,
      crop_variety: form.crop_variety || null,
      planting_date: form.planting_date || null,
      expected_harvest_date: form.expected_harvest_date || null,
      plot_name: form.plot_name || null,
      plot_size: form.plot_size ? Number(form.plot_size) : null,
      water_source: form.water_source,
      soil_condition: form.soil_condition || null,
      drainage_condition: form.drainage_condition || null,
      current_season: form.current_season,
      seed_source: form.seed_source || null,
      seed_cost: form.seed_cost ? Number(form.seed_cost) : null,
      total_budget: form.total_budget ? Number(form.total_budget) : null,
      fertilizer_plan: form.fertilizer_plan || null,
      labor_cost: form.labor_cost ? Number(form.labor_cost) : null,
      ai_monitoring: form.ai_monitoring,
      growth_stage: form.growth_stage,
      priority_goal: form.priority_goal,
      risk_tolerance: form.risk_tolerance,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("active_crops" as any).update(payload as any).eq("id", editCrop.id);
    if (error) {
      toast({ title: "Failed to update crop", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${cropName} updated!` });
      setShowAdd(false);
      setEditCrop(null);
      setForm(defaultForm);
      setStep(1);
      loadCrops();
    }
    setSaving(false);
  };

  const stageColor: Record<string, string> = {
    seedling: "green", vegetative: "accent", flowering: "warning", fruiting: "primary", harvest: "red",
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-1">Active Crops</h2>
          <p className="text-sm text-muted-foreground">{crops.length} crop{crops.length !== 1 ? "s" : ""} being managed</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Crop
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : crops.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Sprout className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-base font-medium text-muted-foreground">No active crops yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Add your first crop to start tracking and get AI-powered insights</p>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Your First Crop</Button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {crops.map((crop, i) => {
            const days = daysUntilHarvest(crop.expected_harvest_date);
            const planted = daysSincePlanting(crop.planting_date);
            const risk = getRiskLevel(crop);
            const rc = riskColors[risk];
            return (
              <motion.div key={crop.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <GlassCard hoverable className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sprout className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-foreground">{crop.crop_name}</h3>
                        {crop.crop_variety && <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded">{crop.crop_variety}</span>}
                        <StatusBadge variant={stageColor[crop.growth_stage] as any || "accent"}>{crop.growth_stage}</StatusBadge>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>{rc.label}</span>
                        {crop.ai_monitoring && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">AI</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {crop.plot_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{crop.plot_name}</span>}
                        {planted !== null && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{planted}d since planting</span>}
                        {days !== null && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{days > 0 ? `${days}d to harvest` : "Ready to harvest!"}</span>}
                        {crop.water_source && <span className="flex items-center gap-1"><Droplets className="h-3 w-3" />{crop.water_source}</span>}
                        {crop.total_budget && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />RM {crop.total_budget.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setViewCrop(crop)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(crop)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(crop.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Planned / Preferred Crops Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold font-serif text-foreground flex items-center gap-2">
              <Sprout className="h-5 w-5 text-accent" /> Preferred Crops
            </h2>
            <p className="text-xs text-muted-foreground">Add crops you're considering to plant — the advisory engine will provide suitability suggestions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddPlanned(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {plannedCrops.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Sprout className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No preferred crops yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-3">Add crops you're considering to plant — the advisory engine will provide suitability suggestions</p>
            <Button variant="outline" size="sm" onClick={() => setShowAddPlanned(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Planned Crop
            </Button>
          </GlassCard>
        ) : (
          <div className="flex flex-wrap gap-2">
            {plannedCrops.map(crop => (
              <motion.div key={crop} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent/10 border border-accent/20 group">
                <Sprout className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">{crop}</span>
                <button onClick={() => removePlannedCrop(crop)}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Planned Crop Dialog */}
      <Dialog open={showAddPlanned} onOpenChange={(open) => { setShowAddPlanned(open); if (!open) { setPlannedInput(""); setPlannedCustom(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-accent" /> Add Planned Crop
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Select a crop you're interested in planting. The advisory engine will analyze its suitability for your farm.</p>
          <div className="space-y-3 mt-2">
            <Select value={plannedInput} onValueChange={v => { setPlannedInput(v); if (v !== "__custom") setPlannedCustom(""); }}>
              <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
              <SelectContent>
                {CROP_OPTIONS.filter(c => !plannedCrops.includes(c) && !crops.some(ac => ac.crop_name === c)).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="__custom">Other (custom)</SelectItem>
              </SelectContent>
            </Select>
            {plannedInput === "__custom" && (
              <Input placeholder="Enter crop name" value={plannedCustom} onChange={e => setPlannedCustom(e.target.value)} autoFocus />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddPlanned(false)}>Cancel</Button>
            <Button onClick={addPlannedCrop} disabled={savingPlanned || (!plannedInput || (plannedInput === "__custom" && !plannedCustom.trim()))} className="gap-1.5">
              {savingPlanned ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Crop Dialog - Progressive Steps */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setStep(1); setForm(defaultForm); setEditCrop(null); setCustomCrop(""); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              {editCrop ? `Edit ${editCrop.crop_name}` : `Add New Crop`} — Step {step} of 4
            </DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-secondary/50"}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sprout className="h-4 w-4 text-primary" /> Basic Crop Information</h3>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Crop Type *</label>
                  <Select value={form.crop_name === "__custom" ? "__custom" : (CROP_OPTIONS.includes(form.crop_name) ? form.crop_name : "__custom")} onValueChange={(v) => {
                    if (v === "__custom") {
                      updateField("crop_name", "__custom");
                      setCustomCrop("");
                    } else {
                      updateField("crop_name", v);
                      setCustomCrop("");
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                    <SelectContent>
                      {CROP_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="__custom">Other (custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.crop_name === "__custom" && (
                    <Input className="mt-2" placeholder="Enter crop name" value={customCrop} onChange={e => setCustomCrop(e.target.value)} autoFocus />
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Crop Variety (optional)</label>
                  <Input placeholder="e.g., MR CL3 rice" value={form.crop_variety} onChange={e => updateField("crop_variety", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Planting Date</label>
                    <Input type="date" value={form.planting_date} onChange={e => updateField("planting_date", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Expected Harvest</label>
                    <Input type="date" value={form.expected_harvest_date} onChange={e => updateField("expected_harvest_date", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Field/Plot Name (optional)</label>
                  <Input placeholder='e.g., "North Field"' value={form.plot_name} onChange={e => updateField("plot_name", e.target.value)} />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Location & Growing Conditions</h3>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Plot Size (acres)</label>
                  <Input type="number" placeholder="e.g., 2.5" value={form.plot_size} onChange={e => updateField("plot_size", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Water Source</label>
                  <Select value={form.water_source} onValueChange={v => updateField("water_source", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rain-fed">Rain-fed</SelectItem>
                      <SelectItem value="irrigation">Irrigation</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Drainage Condition</label>
                  <Select value={form.drainage_condition || ""} onValueChange={v => updateField("drainage_condition", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Current Season</label>
                  <Select value={form.current_season} onValueChange={v => updateField("current_season", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="wet">Wet</SelectItem>
                      <SelectItem value="monsoon">Monsoon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Cost & Investment (Optional)</h3>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Seed Source / Supplier</label>
                  <Input placeholder="Supplier name" value={form.seed_source} onChange={e => updateField("seed_source", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Seed Cost (RM)</label>
                    <Input type="number" placeholder="0" value={form.seed_cost} onChange={e => updateField("seed_cost", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Total Budget (RM)</label>
                    <Input type="number" placeholder="0" value={form.total_budget} onChange={e => updateField("total_budget", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Fertilizer Plan (optional)</label>
                  <Textarea placeholder="e.g., NPK 15-15-15 at 2 weeks..." value={form.fertilizer_plan} onChange={e => updateField("fertilizer_plan", e.target.value)} rows={2} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Labor Cost (RM, optional)</label>
                  <Input type="number" placeholder="0" value={form.labor_cost} onChange={e => updateField("labor_cost", e.target.value)} />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /> AI Monitoring & Risk</h3>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable AI Monitoring</p>
                    <p className="text-xs text-muted-foreground">Get alerts on growth, weather & market risks</p>
                  </div>
                  <Switch checked={form.ai_monitoring} onCheckedChange={v => updateField("ai_monitoring", v)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Growth Stage</label>
                  <Select value={form.growth_stage} onValueChange={v => updateField("growth_stage", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROWTH_STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Priority Goal</label>
                  <Select value={form.priority_goal} onValueChange={v => updateField("priority_goal", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max_profit">Maximum Profit</SelectItem>
                      <SelectItem value="low_risk">Low Risk</SelectItem>
                      <SelectItem value="fast_harvest">Fast Harvest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Risk Tolerance</label>
                  <Select value={form.risk_tolerance} onValueChange={v => updateField("risk_tolerance", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Notes (optional)</label>
                  <Textarea placeholder="Any notes about this crop..." value={form.notes} onChange={e => updateField("notes", e.target.value)} rows={2} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
            <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : setShowAdd(false)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} className="gap-1" disabled={step === 1 && !form.crop_name}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={editCrop ? handleUpdate : handleSave} disabled={saving || !form.crop_name} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editCrop ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editCrop ? "Update Crop" : "Add Crop"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Crop Detail */}
      <Dialog open={!!viewCrop} onOpenChange={() => setViewCrop(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {viewCrop && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-primary" /> {viewCrop.crop_name}
                  {viewCrop.crop_variety && <span className="text-sm font-normal text-muted-foreground">({viewCrop.crop_variety})</span>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Growth Stage", value: viewCrop.growth_stage, capitalize: true },
                    { label: "Water Source", value: viewCrop.water_source },
                    { label: "Plot", value: viewCrop.plot_name || "—" },
                    { label: "Plot Size", value: viewCrop.plot_size ? `${viewCrop.plot_size} acres` : "—" },
                    { label: "Planted", value: viewCrop.planting_date ? new Date(viewCrop.planting_date).toLocaleDateString("en-MY") : "—" },
                    { label: "Expected Harvest", value: viewCrop.expected_harvest_date ? new Date(viewCrop.expected_harvest_date).toLocaleDateString("en-MY") : "—" },
                    { label: "Season", value: viewCrop.current_season },
                    { label: "Drainage", value: viewCrop.drainage_condition || "—" },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-lg bg-secondary/20">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
                      <p className={`text-sm font-semibold text-foreground ${item.capitalize ? "capitalize" : ""}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {(viewCrop.seed_cost || viewCrop.total_budget || viewCrop.labor_cost) && (
                  <GlassCard className="p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Investment</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div><p className="text-[10px] text-muted-foreground">Seed Cost</p><p className="text-sm font-bold text-foreground">RM {viewCrop.seed_cost?.toLocaleString() || "—"}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Budget</p><p className="text-sm font-bold text-foreground">RM {viewCrop.total_budget?.toLocaleString() || "—"}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Labor</p><p className="text-sm font-bold text-foreground">RM {viewCrop.labor_cost?.toLocaleString() || "—"}</p></div>
                    </div>
                    {viewCrop.seed_source && <p className="text-xs text-muted-foreground mt-2">Supplier: {viewCrop.seed_source}</p>}
                  </GlassCard>
                )}
                {viewCrop.notes && (
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-foreground">{viewCrop.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <StatusBadge variant={viewCrop.ai_monitoring ? "green" : "accent"}>AI {viewCrop.ai_monitoring ? "ON" : "OFF"}</StatusBadge>
                  <StatusBadge variant={viewCrop.risk_tolerance === "high" ? "red" : viewCrop.risk_tolerance === "low" ? "green" : "warning"}>Risk: {viewCrop.risk_tolerance}</StatusBadge>
                  <StatusBadge variant="accent">{viewCrop.priority_goal.replace("_", " ")}</StatusBadge>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
