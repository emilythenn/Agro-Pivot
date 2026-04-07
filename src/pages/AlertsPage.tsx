import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CloudRain, TrendingUp, AlertTriangle, Camera, Check, Loader2, Filter, Flame, Leaf, FileText, Clock, ChevronDown, ChevronUp, Newspaper, ShieldAlert, TimerOff, Archive } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { getAlerts, markAlertRead, markAllAlertsRead } from "@/lib/api";
import { triggerNotificationEngine, getSeverityColors } from "@/lib/notificationService";
import { toast } from "@/hooks/use-toast";

const typeIcons: Record<string, any> = {
  Weather: CloudRain, Market: TrendingUp, "Crop Health": Camera,
  "Crop Advisory": Leaf, Evidence: FileText, "Smart Alert": Flame, Reminder: Clock, Scan: Camera,
};

const ALERT_TYPES = new Set(["Smart Alert", "Crop Health", "Evidence"]);
function isActionableAlert(a: any): boolean {
  const sev = a.severity || "medium";
  if (sev === "high") return true;
  if (sev === "medium" && ALERT_TYPES.has(a.alert_type)) return true;
  if (sev === "medium" && a.alert_type === "Crop Advisory" && a.message && /stop|delay|switch|urgent|immediate/i.test(a.message)) return true;
  return false;
}

function isExpired(a: any): boolean {
  if (!a.expires_at) return false;
  return new Date(a.expires_at) < new Date();
}

function getExpiryLabel(a: any): string | null {
  if (!a.expires_at) return null;
  const expires = new Date(a.expires_at);
  const now = new Date();
  if (expires < now) return "Expired";
  const hoursLeft = Math.ceil((expires.getTime() - now.getTime()) / 3600000);
  if (hoursLeft <= 24) return `Expires in ${hoursLeft}h`;
  const daysLeft = Math.ceil(hoursLeft / 24);
  return `Expires in ${daysLeft}d`;
}

type TabMode = "alerts" | "news";
type SeverityFilter = "all" | "high" | "medium" | "low";
type TypeFilter = string; // "all" | alert_type values | "__expired__" | "__older_news__"
type DateRange = "all" | "1w" | "2w" | "1m" | "2m" | "3m";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "1w", label: "Past 1 Week" },
  { value: "2w", label: "Past 2 Weeks" },
  { value: "1m", label: "Past 1 Month" },
  { value: "2m", label: "Past 2 Months" },
  { value: "3m", label: "Past 3 Months" },
];

function getDateCutoff(range: DateRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const map: Record<string, number> = { "1w": 7, "2w": 14, "1m": 30, "2m": 60, "3m": 90 };
  return new Date(now.getTime() - (map[range] || 0) * 24 * 3600000);
}

export default function AlertsPage() {
  const { t } = useSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [tab, setTab] = useState<TabMode>("alerts");
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const loadAlerts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getAlerts(user.id);
      setAllItems(data);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const refreshAlerts = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      const result = await triggerNotificationEngine(user.id);
      if (result.new_alerts > 0) {
        toast({ title: `${result.new_alerts} new update${result.new_alerts > 1 ? "s" : ""}` });
      }
      await loadAlerts();
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAlerts(); }, [user]);
  useEffect(() => {
    if (user) {
      triggerNotificationEngine(user.id).then(result => {
        if (result.new_alerts > 0) loadAlerts();
      }).catch(console.error);
    }
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await markAlertRead(id);
      setAllItems(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
      window.dispatchEvent(new CustomEvent("alerts-updated", { detail: allItems.filter(a => !a.read).length - 1 }));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllAlertsRead(user.id);
      setAllItems(prev => prev.map(a => ({ ...a, read: true })));
      window.dispatchEvent(new CustomEvent("alerts-updated", { detail: 0 }));
      toast({ title: `All ${tab} marked as read` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Split into categories
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 3600000);
  const activeActionable = allItems.filter(a => isActionableAlert(a) && !isExpired(a));
  const activeNews = allItems.filter(a => !isActionableAlert(a) && !isExpired(a) && new Date(a.created_at) >= threeMonthsAgo);
  const olderNews = allItems.filter(a => !isActionableAlert(a) && !isExpired(a) && new Date(a.created_at) < threeMonthsAgo);
  const expiredItems = allItems.filter(a => isExpired(a) && isActionableAlert(a));

  // currentItems based on typeFilter special values
  const isExpiredFilter = typeFilter === "__expired__";
  const isOlderNewsFilter = typeFilter === "__older_news__";

  const currentItems = (() => {
    if (tab === "alerts") {
      if (isExpiredFilter) return expiredItems;
      return activeActionable;
    }
    if (isOlderNewsFilter) return olderNews;
    return activeNews;
  })();

  const dateCutoff = getDateCutoff(dateRange);
  const filteredItems = currentItems
    .filter(a => filter === "all" || (a.severity || "medium") === filter)
    .filter(a => isExpiredFilter || isOlderNewsFilter || typeFilter === "all" || a.alert_type === typeFilter)
    .filter(a => !dateCutoff || new Date(a.created_at) >= dateCutoff);

  const unreadAlerts = activeActionable.filter(a => !a.read).length;
  const unreadNews = activeNews.filter(a => !a.read).length;

  const availableTypes = tab === "alerts"
    ? [...new Set([...activeActionable].map(a => a.alert_type))]
    : [...new Set(activeNews.map(a => a.alert_type))];

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-serif text-foreground mb-1">Alerts & News</h2>
            <p className="text-sm text-muted-foreground">
              {unreadAlerts} unread alert{unreadAlerts !== 1 ? "s" : ""} · {unreadNews} news update{unreadNews !== 1 ? "s" : ""}
              {expiredItems.length > 0 && ` · ${expiredItems.length} expired`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshAlerts} disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-2 rounded-lg disabled:opacity-50">
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              {refreshing ? "Checking..." : "Check Now"}
            </button>
            {!isExpiredFilter && (tab === "alerts" ? unreadAlerts : unreadNews) > 0 && (
              <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary/30 px-3 py-2 rounded-lg">
                <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                Mark All Read
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Toggle: Alerts / News */}
      <div className="flex items-center gap-1 bg-secondary/30 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab("alerts"); setFilter("all"); setTypeFilter("all"); setDateRange("all"); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === "alerts" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Alerts
          {unreadAlerts > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === "alerts" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive/10 text-destructive"
            }`}>{unreadAlerts}</span>
          )}
        </button>
        <button
          onClick={() => { setTab("news"); setFilter("all"); setTypeFilter("all"); setDateRange("all"); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === "news" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Newspaper className="h-4 w-4" />
          News
          {unreadNews > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === "news" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
            }`}>{unreadNews}</span>
          )}
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        {tab === "alerts"
          ? (isExpiredFilter ? "⏰ Expired alerts that are no longer active. Kept for your reference." : "⚠️ Critical & actionable items that require your attention.")
          : (isOlderNewsFilter ? "📂 News updates older than 3 months." : "📰 General updates from the past 3 months.")}
      </p>

      {/* News section filters */}
      {tab === "news" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button onClick={() => setTypeFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
            }`}>All ({activeNews.length})</button>
          {availableTypes.map(type => {
            const count = activeNews.filter(a => a.alert_type === type).length;
            return (
              <button key={type} onClick={() => setTypeFilter(type)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  typeFilter === type ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                }`}>{type} ({count})</button>
            );
          })}

          {/* Older News - same level as type filters */}
          <button
            onClick={() => setTypeFilter(isOlderNewsFilter ? "all" : "__older_news__")}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              isOlderNewsFilter ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
            }`}
            title={olderNews.length === 0 ? "News older than 3 months will be stored here" : `${olderNews.length} older news items`}
          >
            <Archive className="h-3.5 w-3.5" />
            {olderNews.length > 0 ? `Older News (${olderNews.length})` : "Older News"}
          </button>

          {/* Time dropdown */}
          {!isOlderNewsFilter && (
            <div className="ml-auto relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="appearance-none text-xs font-medium px-3 py-1.5 pr-7 rounded-full bg-secondary/30 text-muted-foreground hover:bg-secondary/50 transition-colors cursor-pointer border-none outline-none"
              >
                {DATE_RANGE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Clock className="h-3 w-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Priority Summary (Alerts tab only) */}
      {tab === "alerts" && !isExpiredFilter && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { sev: "high" as const, label: "🔴 High", color: "text-destructive", border: "border-l-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
            { sev: "medium" as const, label: "🟡 Medium", color: "text-warning", border: "border-l-warning", bg: "bg-warning/10", icon: TrendingUp },
            { sev: "low" as const, label: "🟢 Low", color: "text-primary", border: "border-l-primary", bg: "bg-primary/10", icon: Bell },
          ].map(({ sev, label, color, border, bg, icon: Icon }) => {
            const count = activeActionable.filter(a => (a.severity || "medium") === sev && !a.read).length;
            return (
              <motion.div key={sev} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setFilter(filter === sev ? "all" : sev)} className="cursor-pointer">
                <GlassCard className={`p-4 border-l-4 ${border}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{count}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Type Filter + Expired (alerts section) */}
      {tab === "alerts" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button onClick={() => setTypeFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
            }`}>All ({activeActionable.length})</button>
          {availableTypes.map(type => {
            const count = activeActionable.filter(a => a.alert_type === type).length;
            return (
              <button key={type} onClick={() => setTypeFilter(type)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  typeFilter === type ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                }`}>{type} ({count})</button>
            );
          })}

          {/* Expired - same level as type filters */}
          <button
            onClick={() => setTypeFilter(isExpiredFilter ? "all" : "__expired__")}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              isExpiredFilter ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <TimerOff className="h-3.5 w-3.5" />
            Expired ({expiredItems.length})
          </button>
        </div>
      )}

      {/* Filter indicator */}
      {(filter !== "all" || typeFilter !== "all" || dateRange !== "all") && (
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Showing {filter !== "all" && <span className="font-semibold text-foreground">{filter} priority </span>}
            {typeFilter !== "all" && typeFilter !== "__expired__" && typeFilter !== "__older_news__" && <span className="font-semibold text-foreground">{typeFilter} </span>}
            {isExpiredFilter && <span className="font-semibold text-foreground">Expired </span>}
            {isOlderNewsFilter && <span className="font-semibold text-foreground">Older News </span>}
            {dateRange !== "all" && <span className="font-semibold text-foreground">{DATE_RANGE_OPTIONS.find(d => d.value === dateRange)?.label} </span>}
            {tab}
          </span>
          <button onClick={() => { setFilter("all"); setTypeFilter("all"); setDateRange("all"); }} className="text-xs text-primary hover:underline ml-1">Clear</button>
        </div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <GlassCard className="p-12 text-center">
          {tab === "alerts" && isExpiredFilter ? (
            <>
              <TimerOff className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No expired alerts.</p>
            </>
          ) : tab === "alerts" ? (
            <>
              <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No critical alerts right now. Your farm is looking good! 🌱</p>
            </>
          ) : isOlderNewsFilter ? (
            <>
              <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No older news. News older than 3 months will appear here.</p>
            </>
          ) : (
            <>
              <Newspaper className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No news updates yet. Click "Check Now" to fetch latest updates.</p>
            </>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item: any, i: number) => {
            const Icon = typeIcons[item.alert_type] || AlertTriangle;
            const sev = (item.severity || "medium") as string;
            const colors = getSeverityColors(sev);
            const isNews = tab === "news";
            const expired = isExpired(item);
            const expiryLabel = getExpiryLabel(item);

            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <div className="cursor-pointer" onClick={() => {
                  if (!item.read) handleMarkRead(item.id);
                  setExpandedId(expandedId === item.id ? null : item.id);
                }}>
                  <GlassCard className={`p-5 ${isNews ? "border-l-4 border-l-accent" : `border-l-4 ${colors.border}`} ${item.read || expired ? "opacity-60" : ""} hover:shadow-md transition-all`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isNews ? "bg-accent/10" : colors.bg}`}>
                        <Icon className={`h-5 w-5 ${isNews ? "text-accent" : colors.text}`} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {!isNews && <StatusBadge variant={colors.badge}>{colors.label}</StatusBadge>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isNews ? "bg-accent/10 text-accent" : `${colors.bg} ${colors.text}`} font-medium`}>
                            {item.alert_type}
                          </span>
                          {expired && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground font-semibold">
                              ⏰ Expired
                            </span>
                          )}
                          {!expired && expiryLabel && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/30 text-muted-foreground font-medium">
                              {expiryLabel}
                            </span>
                          )}
                          {!item.read && !expired && <span className={`w-2 h-2 ${isNews ? "bg-accent" : colors.dot} rounded-full animate-pulse`} />}
                          <span className="text-[10px] text-muted-foreground ml-auto bg-secondary/30 px-2 py-0.5 rounded">
                            {new Date(item.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-0.5">{item.title}</p>
                        <p className={`text-sm leading-relaxed text-foreground/90 ${expandedId !== item.id ? "line-clamp-2" : ""}`}>{item.message}</p>

                        <AnimatePresence>
                          {expandedId === item.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-border/30">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-2 rounded bg-secondary/20">
                                  <p className="text-muted-foreground font-medium">Type</p>
                                  <p className="text-foreground font-semibold">{item.alert_type}</p>
                                </div>
                                <div className="p-2 rounded bg-secondary/20">
                                  <p className="text-muted-foreground font-medium">{isNews ? "Category" : "Severity"}</p>
                                  <p className={`font-semibold ${isNews ? "text-accent" : colors.text}`}>{isNews ? "News Update" : (item.severity || "medium").toUpperCase()}</p>
                                </div>
                                <div className="p-2 rounded bg-secondary/20">
                                  <p className="text-muted-foreground font-medium">Received</p>
                                  <p className="text-foreground font-semibold">{new Date(item.created_at).toLocaleString("en-MY", { dateStyle: "full", timeStyle: "short" })}</p>
                                </div>
                                <div className="p-2 rounded bg-secondary/20">
                                  <p className="text-muted-foreground font-medium">Expires</p>
                                  <p className={`font-semibold ${expired ? "text-muted-foreground" : "text-foreground"}`}>
                                    {item.expires_at ? new Date(item.expires_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" }) : "No expiry"}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">{item.read ? "✓ Read" : "Unread — click to mark as read"}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <button className="text-[10px] text-primary mt-2 flex items-center gap-1 hover:underline">
                          {expandedId === item.id ? <><ChevronUp className="h-3 w-3" /> Less</> : <><ChevronDown className="h-3 w-3" /> Details</>}
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
