import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search, Globe, Settings, X, CloudRain, TrendingUp, Camera, AlertTriangle, LayoutDashboard, BarChart3, Sprout, FileText, Leaf, FlaskConical, Cloud, Shield, User } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useState, useRef, useEffect, useMemo } from "react";
import { useSettings, type Language } from "@/contexts/SettingsContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const alerts = [
  { icon: CloudRain, type: "Weather", message: "Flood warning — Kedah & Perlis", time: "2h ago", severity: "high" as const, read: false },
  { icon: TrendingUp, type: "Market", message: "Ginger surged +12.1%", time: "5h ago", severity: "medium" as const, read: false },
  { icon: Camera, type: "Scan", message: "Padi Angin anomaly confirmed", time: "1d ago", severity: "high" as const, read: false },
  { icon: AlertTriangle, type: "Weather", message: "36°C spike forecast Thursday", time: "2d ago", severity: "medium" as const, read: true },
  { icon: TrendingUp, type: "Market", message: "Chili down 3.8% this week", time: "3d ago", severity: "low" as const, read: true },
];

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
];

const severityDot = { high: "bg-destructive", medium: "bg-warning", low: "bg-muted-foreground" };

interface SearchItem {
  label: string;
  keywords: string[];
  path: string;
  icon: any;
  category: string;
}

const searchItems: SearchItem[] = [
  { label: "Overview Dashboard", keywords: ["overview", "dashboard", "home", "status", "ringkasan", "papan pemuka", "概览", "仪表板", "மேலோட்டம்"], path: "/dashboard", icon: LayoutDashboard, category: "Pages" },
  { label: "Weather Intelligence", keywords: ["weather", "forecast", "rain", "temperature", "humidity", "wind", "flood", "cuaca", "ramalan", "hujan", "suhu", "天气", "预报", "雨", "温度", "வானிலை", "மழை"], path: "/dashboard/weather", icon: Cloud, category: "Pages" },
  { label: "Market Prices", keywords: ["market", "price", "commodity", "trade", "sell", "buy", "ginger", "chili", "padi", "rice", "pasaran", "harga", "komoditi", "市场", "价格", "商品", "சந்தை", "விலை"], path: "/dashboard/market", icon: BarChart3, category: "Pages" },
  { label: "Crop Advisory", keywords: ["crop", "advisory", "plant", "planting", "harvest", "season", "fertilizer", "tanaman", "nasihat", "tanam", "musim", "baja", "作物", "种植", "建议", "பயிர்", "ஆலோசனை"], path: "/dashboard/crops", icon: Sprout, category: "Pages" },
  { label: "Seed Scanner", keywords: ["scan", "scanner", "seed", "seedling", "photo", "camera", "analyze", "analysis", "germination", "imbas", "benih", "kamera", "analisis", "扫描", "种子", "分析", "ஸ்கேன்", "விதை"], path: "/dashboard/scanner", icon: Camera, category: "Pages" },
  { label: "Evidence Locker", keywords: ["evidence", "report", "download", "pdf", "docx", "csv", "locker", "bukti", "laporan", "muat turun", "证据", "报告", "下载", "சான்று", "அறிக்கை"], path: "/dashboard/evidence", icon: FileText, category: "Pages" },
  { label: "Rescue Planner", keywords: ["planner", "rescue", "plan", "replant", "alternative", "crop plan", "perancang", "rancang", "tanam semula", "计划", "补种", "திட்டமிடல்"], path: "/dashboard/planner", icon: Leaf, category: "Pages" },
  { label: "Risk Simulator", keywords: ["simulator", "simulation", "risk", "scenario", "flood", "drought", "heatwave", "el nino", "la nina", "simulasi", "risiko", "banjir", "kemarau", "模拟", "风险", "洪水", "உருவகப்படுத்தி", "ஆபத்து"], path: "/dashboard/simulator", icon: FlaskConical, category: "Pages" },
  { label: "Alerts & Notifications", keywords: ["alert", "notification", "warning", "amaran", "pemberitahuan", "警报", "通知", "எச்சரிக்கை"], path: "/dashboard/alerts", icon: Bell, category: "Pages" },
  { label: "Settings & Profile", keywords: ["settings", "profile", "account", "theme", "language", "password", "tetapan", "profil", "akaun", "bahasa", "设置", "个人资料", "语言", "அமைப்புகள்", "சுயவிவரம்"], path: "/dashboard/settings", icon: Settings, category: "Pages" },
  // Feature shortcuts
  { label: "Change Language", keywords: ["language", "english", "malay", "chinese", "tamil", "bahasa", "中文", "தமிழ்", "tukar bahasa", "切换语言"], path: "/dashboard/settings", icon: Globe, category: "Features" },
  { label: "Upload Seed Photo", keywords: ["upload", "photo", "image", "capture", "muat naik", "foto", "gambar", "上传", "照片", "புகைப்படம்"], path: "/dashboard/scanner", icon: Camera, category: "Features" },
  { label: "Generate Evidence Report", keywords: ["generate", "report", "evidence", "create", "jana", "cipta", "laporan", "生成", "报告", "உருவாக்கு", "அறிக்கை"], path: "/dashboard/evidence", icon: FileText, category: "Features" },
  { label: "Run Risk Simulation", keywords: ["run", "simulate", "test", "scenario", "jalankan", "simulasi", "uji", "运行", "模拟", "இயக்கு"], path: "/dashboard/simulator", icon: FlaskConical, category: "Features" },
  { label: "View Market Trends", keywords: ["trend", "chart", "graph", "price trend", "aliran", "carta", "graf", "趋势", "图表", "போக்கு"], path: "/dashboard/market", icon: TrendingUp, category: "Features" },
  { label: "Check Weather Forecast", keywords: ["check", "forecast", "today", "tomorrow", "semak", "ramalan", "hari ini", "查看", "预报", "சரிபார்"], path: "/dashboard/weather", icon: CloudRain, category: "Features" },
];

export default function DashboardLayout() {
  const { user, loading } = useRequireAuth();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { t, language, setLanguage } = useSettings();
  const navigate = useNavigate();
  const langRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const unreadCount = alerts.filter((a) => !a.read).length;
  const currentLang = languages.find((l) => l.code === language);

  const filteredResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return searchItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    ).slice(0, 8);
  }, [search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) setShowAlerts(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSelect = (item: SearchItem) => {
    navigate(item.path);
    setSearch("");
    setShowSearch(false);
    inputRef.current?.blur();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSelect(filteredResults[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSearch(false);
      setSearch("");
      inputRef.current?.blur();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="glass-panel rounded-none h-14 flex items-center justify-between px-4 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="h-5 w-px bg-border/50" />
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                <label htmlFor="dashboard-search" className="sr-only">Search</label>
                <input
                  id="dashboard-search"
                  ref={inputRef}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t("header.search")}
                  className="w-56 bg-secondary/30 border border-border/40 rounded-lg pl-9 pr-3 py-1.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                />
                {/* Search Results Dropdown */}
                {showSearch && search.trim() && (
                  <div className="absolute left-0 top-full mt-1.5 w-80 bg-card border border-border rounded-xl z-50 shadow-xl overflow-hidden">
                    {filteredResults.length > 0 ? (
                      <>
                        {/* Group by category */}
                        {["Pages", "Features"].map(cat => {
                          const items = filteredResults.filter(r => r.category === cat);
                          if (!items.length) return null;
                          return (
                            <div key={cat}>
                              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium bg-secondary/20">
                                {cat}
                              </div>
                              {items.map((item) => {
                                const globalIdx = filteredResults.indexOf(item);
                                const Icon = item.icon;
                                return (
                                  <button
                                    key={item.label}
                                    onClick={() => handleSearchSelect(item)}
                                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                                      globalIdx === selectedIndex
                                        ? "bg-primary/10 text-primary"
                                        : "text-foreground hover:bg-secondary/30"
                                    }`}
                                  >
                                    <Icon className="h-4 w-4 flex-shrink-0 opacity-70" strokeWidth={1.5} />
                                    <span className="truncate">{item.label}</span>
                                    <span className="ml-auto text-[10px] text-muted-foreground/50">↵</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <Search className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No results found for "{search}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge variant="green" pulse>{t("header.allSystems")}</StatusBadge>
              <div className="h-5 w-px bg-border/50 mx-1" />

              {/* Language Picker */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => { setShowLang(!showLang); setShowAlerts(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors text-sm"
                  title={t("settings.language")}
                >
                  <span className="text-base">{currentLang?.flag}</span>
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </button>
                {showLang && (
                  <div className="absolute right-0 top-full mt-2 w-48 glass-panel p-1.5 rounded-xl z-50 shadow-xl">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setShowLang(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          language === lang.code ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/40"
                        }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Alerts Bell */}
              <div className="relative" ref={alertRef}>
                <button
                  onClick={() => { setShowAlerts(!showAlerts); setShowLang(false); }}
                  className="relative p-2 rounded-lg hover:bg-secondary/40 transition-colors"
                >
                  <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showAlerts && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl z-50 shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                      <span className="text-sm font-semibold">{t("alerts.title")}</span>
                      <button onClick={() => setShowAlerts(false)} className="p-1 rounded hover:bg-secondary/40">
                        <X className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {alerts.map((alert, i) => (
                        <button
                          key={i}
                          onClick={() => { setShowAlerts(false); navigate("/dashboard/alerts"); }}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/20 transition-colors border-b border-border/10 ${alert.read ? "opacity-50" : ""}`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[alert.severity]}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{alert.type}</span>
                              <span className="text-[10px] text-muted-foreground/60 ml-auto">{alert.time}</span>
                            </div>
                            <p className="text-xs mt-0.5 truncate">{alert.message}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setShowAlerts(false); navigate("/dashboard/alerts"); }}
                      className="w-full text-center py-2.5 text-xs font-medium text-primary hover:bg-secondary/20 transition-colors border-t border-border/30"
                    >
                      View All Alerts →
                    </button>
                  </div>
                )}
              </div>

              {/* Settings */}
              <button
                onClick={() => navigate("/dashboard/settings")}
                className="p-2 rounded-lg hover:bg-secondary/40 transition-colors"
                title={t("nav.settings")}
              >
                <Settings className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
