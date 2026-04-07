import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, ShieldCheck, AlertTriangle, FileText, Loader2, HelpCircle, Pencil, Sprout, Leaf, TreeDeciduous, ArrowRight, Clock, DollarSign, MapPin, TrendingDown, TrendingUp, CircleAlert, CheckCircle2, Info, Download, Eye, Printer, FileType, FileSpreadsheet, ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeScan, getScanHistory, createEvidenceReport, getEvidenceReports } from "@/lib/api";
import { downloadCSV, downloadPDF, downloadDOCX } from "@/lib/reportDownload";
import { logActivity } from "@/lib/activityLogger";
import { supabase } from "@/integrations/supabase/client";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { toast } from "@/hooks/use-toast";
import { FormalReport } from "@/components/FormalReport";

const PRESET_CROPS = [
  "Padi MR220", "Padi MR297", "Ginger", "Mung Bean", "Chili",
  "Corn", "Cucumber", "Cassava", "Kangkung", "Oil Palm",
  "Durian", "Rubber", "Cocoa", "Pepper", "Tomato",
];

type ScanMode = "seedling" | "seed" | "plant";

const SCAN_MODES: { mode: ScanMode; label: string; icon: any; desc: string; tag: string }[] = [
  { mode: "seedling", label: "Seedling Scan", icon: Sprout, desc: "7–14 day emergence analysis — Core feature", tag: "PRIMARY" },
  { mode: "seed", label: "Seed Scan", icon: Leaf, desc: "Pre-planting seed quality check", tag: "SUPPORT" },
  { mode: "plant", label: "Plant Scan", icon: TreeDeciduous, desc: "Growth & health monitoring", tag: "SUPPORT" },
];

function OverallStatusBanner({ status }: { status: string }) {
  const config = {
    healthy: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-600", icon: CheckCircle2, label: "HEALTHY", emoji: "🟢" },
    warning: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600", icon: CircleAlert, label: "WARNING", emoji: "🟡" },
    critical: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-600", icon: AlertTriangle, label: "CRITICAL ISSUE DETECTED", emoji: "🔴" },
  }[status] || { bg: "bg-muted/10 border-border", text: "text-muted-foreground", icon: Info, label: status?.toUpperCase(), emoji: "⚪" };

  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${config.bg}`}>
      <span className="text-3xl">{config.emoji}</span>
      <Icon className={`h-7 w-7 ${config.text}`} />
      <span className={`text-xl font-bold tracking-tight ${config.text}`}>{config.label}</span>
    </div>
  );
}

function StatCard({ label, value, sub, variant }: { label: string; value: string; sub?: string; variant?: "good" | "warn" | "bad" | "neutral" }) {
  const colors = {
    good: "border-emerald-500/20 bg-emerald-500/5",
    warn: "border-amber-500/20 bg-amber-500/5",
    bad: "border-red-500/20 bg-red-500/5",
    neutral: "border-border/30 bg-secondary/10",
  };
  const textColors = { good: "text-emerald-600", warn: "text-amber-600", bad: "text-red-600", neutral: "text-foreground" };
  const v = variant || "neutral";
  return (
    <div className={`rounded-xl border p-3 ${colors[v]}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${textColors[v]}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ScannerPage() {
  const { t, language } = useSettings();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [cropName, setCropName] = useState("Padi MR220");
  const [cropMode, setCropMode] = useState<"preset" | "custom" | "unknown">("preset");
  const [customCrop, setCustomCrop] = useState("");
  const [scanMode, setScanMode] = useState<ScanMode>("seedling");

  useEffect(() => {
    if (user) {
      getScanHistory(user.id).then(setHistory).catch(console.error);
      getEvidenceReports(user.id).then(setReports).catch(console.error);
    }
  }, [user]);

  const uploadImageToStorage = async (file: File, userId: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("scan-images").upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("scan-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setScanning(true);
    setScanResult(null);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const imageUrl = await uploadImageToStorage(file, user.id);

      let image_base64: string | undefined;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        image_base64 = await new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
      }

      let gps_lat: number | undefined, gps_lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        gps_lat = pos.coords.latitude;
        gps_lng = pos.coords.longitude;
      } catch { /* GPS not available */ }

      const result = await analyzeScan({ crop_name: cropName, image_base64, gps_lat, gps_lng, language, scan_mode: scanMode });
      setScanResult({ ...result, image_url: imageUrl });

      const { data: latestScans } = await supabase
        .from("scan_results")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (latestScans?.[0]) {
        await supabase.from("scan_results").update({ image_url: imageUrl }).eq("id", latestScans[0].id);
      }

      const updated = await getScanHistory(user.id);
      setHistory(updated);

      await logActivity({ userId: user.id, activityType: "scan", title: `Scanned ${result.crop_name || cropName} (${scanMode})`, description: result.summary || "", metadata: { status: result.status, germination_rate: result.germination_rate, scan_mode: scanMode } });
      triggerDataRefresh("scans", "alerts", "activity");
      toast({ title: "Scan complete!", description: result.summary?.slice(0, 80) });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const handleGenerateReport = async (scan: any) => {
    if (!user) return;
    setGeneratingReportId(scan.id);
    try {
      await createEvidenceReport({
        user_id: user.id,
        scan_id: scan.id,
        report_title: `${scan.crop_name} — ${scan.status === "anomaly" ? "Anomaly" : "Integrity"} Report`,
        report_type: scan.status === "anomaly" ? "anomaly" : "verification",
        gps_data: { lat: scan.gps_lat, lng: scan.gps_lng },
        ai_analysis: typeof scan.ai_analysis === "object" ? JSON.stringify(scan.ai_analysis) : scan.ai_analysis,
      });
      await logActivity({ userId: user.id, activityType: "report_generated", title: `Generated report: ${scan.crop_name}`, description: scan.status === "anomaly" ? "Anomaly report" : "Verification report" });
      triggerDataRefresh("evidence", "activity");
      // Reload reports
      const updatedReports = await getEvidenceReports(user.id);
      setReports(updatedReports);
      toast({ title: "Report generated!", description: "You can now view or download it below." });
    } catch (e: any) {
      toast({ title: "Report failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingReportId(null);
    }
  };

  const getReportForScan = (scanId: string) => {
    return reports.find((r: any) => r.scan_id === scanId);
  };

  const handleDownloadReport = async (report: any, format: "csv" | "pdf" | "docx") => {
    try {
      if (format === "csv") downloadCSV(report);
      else if (format === "pdf") await downloadPDF(report);
      else if (format === "docx") await downloadDOCX(report);
      if (user) {
        await logActivity({ userId: user.id, activityType: "report_downloaded", title: `Downloaded ${report.report_title}`, description: `Format: ${format.toUpperCase()}`, metadata: { format, report_id: report.id } });
      }
      toast({ title: "Report downloaded!", description: `Saved as ${format.toUpperCase()} file.` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  const getGermVariant = (rate: number): "good" | "warn" | "bad" => rate >= 80 ? "good" : rate >= 60 ? "warn" : "bad";

  const renderSeedlingResult = (r: any) => (
    <div className="space-y-4">
      <OverallStatusBanner status={r.overall_status || (r.status === "healthy" ? "healthy" : "critical")} />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {r.germination_rate !== undefined && (
          <StatCard label="Germination Rate" value={`${r.germination_rate}%`} sub={r.germination_label || (r.germination_rate >= 80 ? "HIGH" : r.germination_rate >= 60 ? "MODERATE" : "LOW")} variant={getGermVariant(r.germination_rate)} />
        )}
        {r.growth_uniformity && (
          <StatCard label="Growth Uniformity" value={r.growth_uniformity} sub={r.growth_uniformity_detail?.slice(0, 40)} variant={r.growth_uniformity === "Good" ? "good" : r.growth_uniformity === "Moderate" ? "warn" : "bad"} />
        )}
        {r.average_height_actual_cm !== undefined && (
          <StatCard label="Avg Height" value={`${r.average_height_actual_cm}cm`} sub={`Expected: ${r.average_height_expected_cm || "?"}cm → ${r.height_status || ""}`} variant={r.height_status === "Normal" ? "good" : "bad"} />
        )}
        {r.gap_detection_percent !== undefined && (
          <StatCard label="Gap Detection" value={`${r.gap_detection_percent}%`} sub={r.gap_detail?.slice(0, 40) || "missing plants"} variant={r.gap_detection_percent <= 10 ? "good" : r.gap_detection_percent <= 30 ? "warn" : "bad"} />
        )}
      </div>

      {/* Padi Angin Risk */}
      {r.padi_angin_risk && r.padi_angin_risk !== "None" && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-600">⚠️ Padi Angin Risk: {r.padi_angin_risk}</p>
          {r.padi_angin_detail && <p className="text-xs text-muted-foreground mt-1">{r.padi_angin_detail}</p>}
        </div>
      )}

      {/* Diagnosis */}
      {r.diagnosis && (
        <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">⚠️ Diagnosis</p>
          <p className="text-sm text-foreground leading-relaxed">{r.diagnosis}</p>
        </div>
      )}

      {/* Action Items */}
      {r.action_items?.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">🚨 Recommended Actions</p>
          <div className="space-y-1.5">
            {r.action_items.map((a: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground font-medium">{a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgency */}
      {r.urgency && (
        <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-amber-600">{r.urgency}</p>
        </div>
      )}

      {/* Financial Impact */}
      {(r.estimated_loss_if_continue_rm || r.estimated_savings_if_act_percent) && (
        <div className="grid grid-cols-2 gap-3">
          {r.estimated_loss_if_continue_rm > 0 && (
            <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
              <TrendingDown className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Potential Loss</p>
                <p className="text-base font-bold text-red-600">RM {r.estimated_loss_if_continue_rm.toLocaleString()}</p>
              </div>
            </div>
          )}
          {r.estimated_savings_if_act_percent > 0 && (
            <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <TrendingUp className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Savings if Act Now</p>
                <p className="text-base font-bold text-emerald-600">Up to {r.estimated_savings_if_act_percent}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rescue Crops */}
      {r.rescue_crops?.length > 0 && r.overall_status !== "healthy" && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">🔄 Recovery Suggestion</p>
          <div className="space-y-2">
            {r.rescue_crops.map((crop: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <Sprout className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{typeof crop === "string" ? crop : crop.name}</p>
                  {typeof crop !== "string" && crop.reason && <p className="text-xs text-muted-foreground">{crop.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSeedResult = (r: any) => (
    <div className="space-y-4">
      <OverallStatusBanner status={r.overall_status || (r.status === "healthy" ? "healthy" : "warning")} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {r.seed_condition && <StatCard label="Seed Condition" value={r.seed_condition} variant={r.seed_condition === "Healthy" ? "good" : r.seed_condition === "Damaged" ? "bad" : "warn"} />}
        {r.color_abnormality && r.color_abnormality !== "None" && <StatCard label="Color" value={r.color_abnormality} variant="warn" />}
        {r.texture_abnormality && r.texture_abnormality !== "None" && <StatCard label="Texture" value={r.texture_abnormality} variant="warn" />}
        {r.moisture_mold_indication && r.moisture_mold_indication !== "None" && <StatCard label="Moisture/Mold" value={r.moisture_mold_indication} variant="bad" />}
      </div>
      {r.diagnosis && (
        <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5">⚠️ Diagnosis</p>
          <p className="text-sm text-foreground">{r.diagnosis}</p>
        </div>
      )}
      {r.disclaimer && (
        <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-600">{r.disclaimer}</p>
        </div>
      )}
      {r.recommendations?.length > 0 && (
        <div className="space-y-1">
          {r.recommendations.map((rec: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />{rec}</p>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlantResult = (r: any) => (
    <div className="space-y-4">
      <OverallStatusBanner status={r.overall_status || (r.status === "healthy" ? "healthy" : "warning")} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {r.growth_health && <StatCard label="Growth Health" value={r.growth_health} variant={r.growth_health === "Healthy" ? "good" : r.growth_health === "Stressed" ? "warn" : "bad"} />}
        {r.maturity_stage && <StatCard label="Maturity Stage" value={r.maturity_stage} variant="neutral" />}
        {r.leaf_color_status && <StatCard label="Leaf Color" value={r.leaf_color_status} sub={r.leaf_color_detail?.slice(0, 40)} variant={r.leaf_color_status === "Normal" ? "good" : "warn"} />}
      </div>
      {r.disease_signs && r.disease_signs !== "None detected" && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <p className="text-xs font-semibold text-red-600">🦠 Disease Signs</p>
          <p className="text-xs text-muted-foreground mt-1">{r.disease_signs}</p>
        </div>
      )}
      {r.diagnosis && (
        <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5">⚠️ Diagnosis</p>
          <p className="text-sm text-foreground">{r.diagnosis}</p>
        </div>
      )}
      {r.action_items?.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">🚨 Actions</p>
          {r.action_items.map((a: string, i: number) => (
            <div key={i} className="flex items-start gap-2 mt-1"><ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" /><p className="text-sm font-medium">{a}</p></div>
          ))}
        </div>
      )}
      {r.urgency && (
        <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <Clock className="h-4 w-4 text-amber-600" /><p className="text-xs font-semibold text-amber-600">{r.urgency}</p>
        </div>
      )}
    </div>
  );

  const renderResult = (r: any) => {
    const mode = r.scan_mode || "seedling";
    if (mode === "seed") return renderSeedResult(r);
    if (mode === "plant") return renderPlantResult(r);
    return renderSeedlingResult(r);
  };

  if (viewingReport) {
    return (
      <div className="max-w-[900px] mx-auto">
        <FormalReport report={viewingReport} onClose={() => setViewingReport(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold font-serif text-foreground mb-1">{t("scanner.title")}</h2>
        <p className="text-sm text-muted-foreground">Financial decision engine based on plant health</p>
      </motion.div>

      {/* Scan Mode Selector */}
      <div className="grid grid-cols-3 gap-3">
        {SCAN_MODES.map((sm) => (
          <button
            key={sm.mode}
            onClick={() => setScanMode(sm.mode)}
            className={`relative rounded-xl border p-4 text-left transition-all ${
              scanMode === sm.mode
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-border/40 hover:border-border hover:bg-secondary/20"
            }`}
          >
            {sm.mode === "seedling" && (
              <span className="absolute top-2 right-2 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">{sm.tag}</span>
            )}
            {sm.mode !== "seedling" && (
              <span className="absolute top-2 right-2 text-[9px] font-medium bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded">{sm.tag}</span>
            )}
            <sm.icon className={`h-6 w-6 mb-2 ${scanMode === sm.mode ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
            <p className={`text-sm font-semibold ${scanMode === sm.mode ? "text-primary" : "text-foreground"}`}>{sm.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sm.desc}</p>
          </button>
        ))}
      </div>

      {/* Crop Selection */}
      <GlassCard className="p-5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">Crop Type</label>
        <div className="flex gap-2 mb-3">
          {([
            { mode: "preset" as const, label: "Select Crop", icon: Sprout },
            { mode: "custom" as const, label: "Type Manually", icon: Pencil },
            { mode: "unknown" as const, label: "AI Identify", icon: HelpCircle },
          ]).map(opt => (
            <button
              key={opt.mode}
              onClick={() => {
                setCropMode(opt.mode);
                if (opt.mode === "unknown") setCropName("unknown");
                else if (opt.mode === "preset") setCropName("Padi MR220");
                else setCropName(customCrop || "");
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                cropMode === opt.mode
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border/40 text-muted-foreground hover:bg-secondary/30"
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {opt.label}
            </button>
          ))}
        </div>
        {cropMode === "preset" && (
          <div className="flex flex-wrap gap-2">
            {PRESET_CROPS.map(crop => (
              <button key={crop} onClick={() => setCropName(crop)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  cropName === crop ? "border-primary bg-primary/10 text-primary font-medium" : "border-border/30 text-muted-foreground hover:bg-secondary/30"
                }`}>{crop}</button>
            ))}
          </div>
        )}
        {cropMode === "custom" && (
          <input value={customCrop} onChange={(e) => { setCustomCrop(e.target.value); setCropName(e.target.value); }}
            placeholder="e.g. Dragon Fruit, Lemongrass..." className="w-full bg-secondary/20 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        )}
        {cropMode === "unknown" && (
          <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
            <HelpCircle className="h-5 w-5 text-accent flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-foreground">AI will identify your crop</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upload a photo and AI will detect the crop type.</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Upload Zone */}
      <div
        onClick={() => !scanning && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith("image/") && !scanning) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            if (fileRef.current) {
              fileRef.current.files = dataTransfer.files;
              fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        }}
        className="cursor-pointer"
      >
        <GlassCard className={`p-10 border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors group ${isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          {scanning ? (
            <>
              {previewUrl && (
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-border/30 mb-2">
                  <img src={previewUrl} alt="Scanning" className="w-full h-full object-cover opacity-60" />
                </div>
              )}
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is analyzing your {scanMode} image...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="h-7 w-7 text-accent" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {scanMode === "seedling" ? "Upload Seedling Photo" : scanMode === "seed" ? "Upload Seed Photo" : "Upload Plant Photo"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {scanMode === "seedling" ? "Tap or drag a photo of your seedlings (7–14 days old)" : scanMode === "seed" ? "Tap or drag a photo of your seeds" : "Tap or drag a photo of your plants"}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{t("scanner.gpsNote")}</p>
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Scan Result */}
      <AnimatePresence>
        {scanResult && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassCard className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-5">
                {scanResult.image_url && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-border/30 flex-shrink-0">
                    <img src={scanResult.image_url} alt="Scan" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Scan Result</h3>
                      {(scanResult.detected_crop || scanResult.crop_name) && (scanResult.detected_crop || scanResult.crop_name) !== "unknown" && (
                        <p className="text-xs text-primary font-medium mt-0.5 flex items-center gap-1">
                          <Sprout className="h-3 w-3" /> {scanResult.detected_crop || scanResult.crop_name}
                          {scanResult.seed_variety && <span className="text-muted-foreground ml-1">({scanResult.seed_variety})</span>}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-secondary/30 text-muted-foreground px-2 py-1 rounded font-medium uppercase">
                      {scanResult.scan_mode || scanMode}
                    </span>
                  </div>
                  {scanResult.summary && <p className="text-sm text-muted-foreground mt-2">{scanResult.summary}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-1">Confidence: {scanResult.confidence || 0}%</p>
                </div>
              </div>

              {/* Mode-specific results */}
              {renderResult(scanResult)}

              {/* Evidence & Actions */}
              <div className="mt-5 pt-4 border-t border-border/30 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Scan recorded • {new Date().toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setScanResult(null); setPreviewUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
                    className="flex items-center gap-1.5 text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" strokeWidth={1.5} /> Scan Again
                  </button>
                  <button onClick={() => {
                    const latestScan = history[0];
                    if (latestScan) handleGenerateReport(latestScan);
                  }}
                    className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" strokeWidth={1.5} /> Generate Fraud Report
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">{t("scanner.history")}</h3>
          <div className="space-y-4">
            {history.map((scan: any, i: number) => {
              const ai = scan.ai_analysis || {};
              const overallStatus = ai.overall_status || (scan.status === "healthy" ? "healthy" : "critical");
              return (
                <motion.div key={scan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <GlassCard className="p-5">
                    <div className="flex items-start gap-4">
                      {scan.image_url && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-border/30 flex-shrink-0">
                          <img src={scan.image_url} alt={scan.crop_name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <span className="text-base font-bold text-foreground">{scan.crop_name}</span>
                            {ai.scan_mode && <span className="ml-2 text-[10px] bg-secondary/30 text-muted-foreground px-1.5 py-0.5 rounded uppercase">{ai.scan_mode}</span>}
                          </div>
                          <StatusBadge variant={overallStatus === "healthy" ? "green" : overallStatus === "warning" ? "warning" : "red"} pulse>
                            {overallStatus === "healthy" ? <><ShieldCheck className="h-3 w-3" /> Healthy</> :
                             overallStatus === "warning" ? <><CircleAlert className="h-3 w-3" /> Warning</> :
                             <><AlertTriangle className="h-3 w-3" /> Critical</>}
                          </StatusBadge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                          {scan.gps_lat && <><span>•</span><span>{scan.gps_lat?.toFixed(4)}°N, {scan.gps_lng?.toFixed(4)}°E</span></>}
                        </div>
                        {ai.summary && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ai.summary}</p>}
                        <div className="flex items-center justify-between pt-2 border-t border-border/20">
                          <div className="flex items-center gap-3">
                            {scan.germination_rate !== null && scan.germination_rate !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                Germ: <span className={`font-bold ${scan.germination_rate > 80 ? "text-emerald-600" : scan.germination_rate > 60 ? "text-amber-600" : "text-red-600"}`}>{scan.germination_rate}%</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const existingReport = getReportForScan(scan.id);
                              if (existingReport) {
                                return (
                                  <>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => setViewingReport(existingReport)}>
                                      <Eye className="h-3 w-3" /> View
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-muted-foreground">
                                          <Download className="h-3 w-3" /> <ChevronDown className="h-2.5 w-2.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleDownloadReport(existingReport, "pdf")} className="gap-2 cursor-pointer text-xs">
                                          <FileText className="h-3.5 w-3.5 text-destructive/70" /> PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadReport(existingReport, "docx")} className="gap-2 cursor-pointer text-xs">
                                          <FileType className="h-3.5 w-3.5 text-primary" /> DOCX
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadReport(existingReport, "csv")} className="gap-2 cursor-pointer text-xs">
                                          <FileSpreadsheet className="h-3.5 w-3.5 text-accent" /> CSV
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                );
                              }
                              return (
                                <button
                                  onClick={() => handleGenerateReport(scan)}
                                  disabled={generatingReportId === scan.id}
                                  className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {generatingReportId === scan.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FileText className="h-3 w-3" strokeWidth={1.5} />
                                  )}
                                  Generate Report
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
