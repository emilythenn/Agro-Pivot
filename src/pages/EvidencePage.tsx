import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Download, MapPin, Clock, Cloud, Loader2, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Printer, Eye, FileSpreadsheet, FileType, Shield, Sprout, Calendar, Hash } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { getEvidenceReports } from "@/lib/api";
import { downloadCSV, downloadPDF, downloadDOCX } from "@/lib/reportDownload";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLogger";
import logoImg from "@/assets/logo.png";

function parseAiAnalysis(raw: string | object | null): any {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return { summary: raw }; }
}

/** Deeply merge scan analysis + report analysis so no fields are lost */
function mergeAnalysis(report: any) {
  const analysis = parseAiAnalysis(report.ai_analysis) || {};
  const scanData = report.scan_results;
  const scanAnalysis = scanData ? (parseAiAnalysis(scanData.ai_analysis) || {}) : {};

  // Merge: scan data as base, report analysis overrides, but arrays are preferred from whichever has them
  const merged = { ...scanAnalysis, ...analysis };

  // Ensure arrays come from whichever source has them
  if (!merged.issues?.length && scanAnalysis.issues?.length) merged.issues = scanAnalysis.issues;
  if (!merged.recommendations?.length && scanAnalysis.recommendations?.length) merged.recommendations = scanAnalysis.recommendations;
  if (merged.germination_rate === undefined && scanAnalysis.germination_rate !== undefined) merged.germination_rate = scanAnalysis.germination_rate;
  if (merged.germination_rate === undefined && scanData?.germination_rate !== undefined) merged.germination_rate = scanData.germination_rate;
  if (merged.confidence === undefined && scanAnalysis.confidence !== undefined) merged.confidence = scanAnalysis.confidence;
  if (!merged.summary && scanAnalysis.summary) merged.summary = scanAnalysis.summary;
  if (!merged.status && scanAnalysis.status) merged.status = scanAnalysis.status;

  return merged;
}

function FormalReport({ report, onClose }: { report: any; onClose: () => void }) {
  const scanData = report.scan_results;
  const printRef = useRef<HTMLDivElement>(null);
  const merged = mergeAnalysis(report);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${report.report_title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; padding: 40px; line-height: 1.6; }
        .header { border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 22px; margin-bottom: 4px; }
        .header p { font-size: 12px; color: #666; }
        .section { margin-bottom: 24px; }
        .section h2 { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; color: #333; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
        .meta-label { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-value { font-weight: 600; }
        .finding { padding: 10px 14px; border-left: 3px solid #c0392b; background: #fdf2f2; margin-bottom: 8px; font-size: 13px; }
        .finding.clean { border-color: #27ae60; background: #f0faf4; }
        .recommendation { padding: 8px 0; border-bottom: 1px dotted #ddd; font-size: 13px; }
        .scan-image { max-width: 320px; border: 1px solid #ddd; border-radius: 4px; margin: 12px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; font-size: 11px; color: #888; text-align: center; }
        .stamp { display: inline-block; border: 2px solid; padding: 6px 16px; font-weight: bold; text-transform: uppercase; font-size: 13px; letter-spacing: 2px; transform: rotate(-3deg); margin-top: 16px; }
        .stamp.anomaly { border-color: #c0392b; color: #c0392b; }
        .stamp.verified { border-color: #27ae60; color: #27ae60; }
        @media print { body { padding: 20px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const isAnomaly = report.report_type === "anomaly";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 text-muted-foreground">
          ← Back to Reports
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <DownloadDropdown report={report} />
        </div>
      </div>

      {/* Formal Report Document */}
      <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        <div ref={printRef}>
          {/* Report Header */}
          <div className="relative bg-gradient-to-br from-secondary/40 via-secondary/20 to-transparent border-b border-border/40 px-8 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-border/30 shadow-sm bg-card flex items-center justify-center">
                  <img src={logoImg} alt="Agro-Pivot" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-[10px] font-bold uppercase tracking-[4px] text-muted-foreground">Agro-Pivot Agricultural Intelligence</h1>
                  <h2 className="text-2xl font-bold font-serif text-foreground mt-1.5">Crop Health Evidence Report</h2>
                </div>
              </div>
              <div className={`px-5 py-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-widest shadow-sm ${isAnomaly ? "border-destructive/50 text-destructive bg-destructive/5" : "border-primary/50 text-primary bg-primary/5"}`}>
                {isAnomaly ? "⚠ Anomaly Detected" : "✓ Verified Clean"}
              </div>
            </div>
          </div>

          <div className="px-8 py-8 space-y-8">
            {/* Report Meta — Card Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetaCard icon={Hash} label="Report ID" value={report.id.slice(0, 12).toUpperCase()} />
              <MetaCard icon={Calendar} label="Date Issued" value={new Date(report.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })} />
              <MetaCard icon={Shield} label="Report Type" value={isAnomaly ? "Anomaly Report" : "Verification Report"} />
              <MetaCard icon={Clock} label="Status" value={(report.status || "completed").charAt(0).toUpperCase() + (report.status || "completed").slice(1)} />
            </div>

            {/* Crop & Location */}
            <ReportSection title="Crop & Location Details" icon={Sprout}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetaCard icon={Sprout} label="Crop Name" value={scanData?.crop_name || "N/A"} />
                <MetaCard icon={Calendar} label="Scan Date" value={scanData?.scan_date ? new Date(scanData.scan_date).toLocaleDateString("en-MY") : "N/A"} />
                <MetaCard icon={MapPin} label="GPS Coordinates" value={
                  report.gps_data?.lat
                    ? `${Number(report.gps_data.lat).toFixed(6)}° N, ${Number(report.gps_data.lng).toFixed(6)}° E`
                    : "Not recorded"
                } />
                <div className={`p-3 rounded-xl border ${
                  merged.germination_rate !== undefined
                    ? merged.germination_rate > 80 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
                    : "border-border/30 bg-secondary/10"
                }`}>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Germination Rate</p>
                  <p className={`text-lg font-bold tabular-nums ${
                    merged.germination_rate !== undefined
                      ? merged.germination_rate > 80 ? "text-primary" : "text-destructive"
                      : "text-foreground"
                  }`}>{merged.germination_rate !== undefined ? `${merged.germination_rate}%` : "N/A"}</p>
                </div>
              </div>
            </ReportSection>

            {/* Confidence & Health Status Bar */}
            {(merged.confidence !== undefined || merged.status) && (
              <div className="flex gap-3">
                {merged.confidence !== undefined && (
                  <div className="flex-1 p-4 rounded-xl bg-secondary/15 border border-border/20">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Confidence Level</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-secondary/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${merged.confidence}%` }} />
                      </div>
                      <span className="text-sm font-bold tabular-nums text-foreground">{merged.confidence}%</span>
                    </div>
                  </div>
                )}
                {merged.status && (
                  <div className={`px-5 flex items-center gap-2 rounded-xl border ${
                    merged.status === "healthy" ? "border-primary/30 bg-primary/5 text-primary" : "border-destructive/30 bg-destructive/5 text-destructive"
                  }`}>
                    {merged.status === "healthy" ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    <span className="text-sm font-bold uppercase tracking-wide">{merged.status}</span>
                  </div>
                )}
              </div>
            )}

            {/* Scanned Image */}
            {scanData?.image_url && (
              <ReportSection title="Photographic Evidence" icon={Eye}>
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="w-full sm:w-72 rounded-xl overflow-hidden border border-border/30 shadow-md">
                    <img src={scanData.image_url} alt="Scanned seedling sample" className="w-full h-auto object-cover" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-2 flex-1 pt-1">
                    <p><span className="font-semibold text-foreground">Figure 1:</span> Seedling sample photograph captured during field inspection.</p>
                    <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Captured: {scanData.scan_date ? new Date(scanData.scan_date).toLocaleDateString("en-MY", { dateStyle: "full" }) : "N/A"}</p>
                    {report.gps_data?.lat && (
                      <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {Number(report.gps_data.lat).toFixed(6)}° N, {Number(report.gps_data.lng).toFixed(6)}° E</p>
                    )}
                  </div>
                </div>
              </ReportSection>
            )}

            {/* Executive Summary */}
            {merged.summary && (
              <ReportSection title="Executive Summary" icon={FileText}>
                <div className="p-4 bg-secondary/10 rounded-xl border border-border/15">
                  <p className="text-sm leading-relaxed text-foreground/90">{merged.summary}</p>
                </div>
              </ReportSection>
            )}

            {/* Findings & Issues */}
            {merged.issues?.length > 0 && (
              <ReportSection title="Findings & Issues" icon={AlertTriangle}>
                <div className="space-y-3">
                  {merged.issues.map((issue: any, i: number) => (
                    <div key={i} className={`p-4 rounded-xl border-l-4 ${
                      issue.severity === "high" ? "border-l-destructive bg-destructive/5" :
                      issue.severity === "medium" ? "border-l-warning bg-warning/5" :
                      "border-l-accent bg-accent/5"
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          issue.severity === "high" ? "bg-destructive/10 text-destructive" : issue.severity === "medium" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"
                        }`}>{issue.severity}</span>
                        <span className="text-sm font-semibold text-foreground">{issue.type}</span>
                      </div>
                      <p className="text-sm text-foreground/80">{issue.description}</p>
                      {issue.affected_percentage && (
                        <p className="text-xs text-muted-foreground mt-1.5">Affected area: <span className="font-semibold text-foreground">{issue.affected_percentage}%</span></p>
                      )}
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}

            {/* Recommendations */}
            {merged.recommendations?.length > 0 && (
              <ReportSection title="Recommendations" icon={ShieldCheck}>
                <div className="space-y-2.5">
                  {merged.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-secondary/10 border border-border/15 hover:bg-secondary/20 transition-colors">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <p className="text-sm text-foreground/90 pt-0.5 leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}

            {/* Footer */}
            <div className="border-t-2 border-border/40 pt-6 mt-10">
              <div className="flex items-center justify-center gap-3 mb-3">
                <img src={logoImg} alt="" className="w-5 h-5 object-contain opacity-40" />
                <div className="h-4 w-px bg-border/40" />
                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">{report.id.slice(0, 12).toUpperCase()}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed max-w-lg mx-auto">
                This report was generated by the Agro-Pivot Agricultural Intelligence Platform.
                All analysis results are AI-generated and should be verified by a qualified agronomist before taking action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetaCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-border/20 bg-secondary/10">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground/60" strokeWidth={1.5} />
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

function ReportSection({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/25">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary/70" strokeWidth={1.5} />}
        <h3 className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DownloadDropdown({ report, size = "default" }: { report: any; size?: "sm" | "default" }) {
  const { user } = useAuth();
  const handleDownload = async (format: "csv" | "pdf" | "docx") => {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={size === "sm" ? "ghost" : "default"} size="sm" className={`gap-1.5 ${size === "sm" ? "text-xs h-8 text-muted-foreground" : "gap-2"}`}>
          <Download className="h-3.5 w-3.5" /> Download <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload("pdf")} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-destructive/70" /> PDF Document
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("docx")} className="gap-2 cursor-pointer">
          <FileType className="h-4 w-4 text-primary" /> Word Document (.docx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("csv")} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-accent" /> CSV Spreadsheet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function EvidencePage() {
  const { t } = useSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [viewingReport, setViewingReport] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getEvidenceReports(user.id)
      .then(setReports)
      .catch((e) => toast({ title: "Failed to load reports", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (viewingReport) {
    return (
      <div className="max-w-[900px] mx-auto">
        <FormalReport report={viewingReport} onClose={() => setViewingReport(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold font-serif text-foreground mb-1">{t("evidence.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("evidence.subtitle")}</p>
      </motion.div>

      {reports.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No evidence reports yet. Generate one from the Scanner page.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any, i: number) => {
            const scanData = report.scan_results;
            const isAnomaly = report.report_type === "anomaly";
            return (
              <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="p-5 hover:shadow-md transition-shadow" glowColor={isAnomaly ? "destructive" : "primary"}>
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {scanData?.image_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-border/30 flex-shrink-0">
                        <img src={scanData.image_url} alt={report.report_title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-secondary/30 border border-border/30 flex-shrink-0 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-foreground">{report.report_title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(report.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</span>
                            {report.gps_data?.lat && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{Number(report.gps_data.lat).toFixed(4)}° N</span>
                            )}
                            <span className="font-mono text-muted-foreground/50">{report.id.slice(0, 8)}</span>
                          </div>
                        </div>
                        <StatusBadge variant={isAnomaly ? "red" : "green"}>
                          {isAnomaly ? "Anomaly" : "Verified"}
                        </StatusBadge>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setViewingReport(report)}>
                          <Eye className="h-3 w-3" /> View Report
                        </Button>
                        <DownloadDropdown report={report} size="sm" />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
