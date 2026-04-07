import { useState, useEffect, useCallback } from "react";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Cloud, BarChart3, Camera, Sprout,
  FlaskConical, Settings, LogOut, ChevronLeft, Search, Bell, Check, CloudRain, TrendingUp, AlertTriangle, Loader2, User, ShoppingBag, ShieldCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getProfile, getUnreadAlertCount, getAlerts, markAlertRead, markAllAlertsRead } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FloatingChatbot } from "@/components/FloatingChatbot";
import logoImg from "@/assets/logo.png";

const farmerNav = [
  { section: "ADVISORY", items: [
    { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.overview", end: true },
    { to: "/dashboard/weather", icon: Cloud, labelKey: "nav.weather" },
    { to: "/dashboard/market", icon: BarChart3, labelKey: "nav.market" },
    { to: "/dashboard/crops", icon: Sprout, labelKey: "nav.crops" },
    { to: "/dashboard/active-crops", icon: Sprout, labelKey: "nav.activeCrops" },
  ]},
  { section: "CROP HEALTH", items: [
    { to: "/dashboard/scanner", icon: Camera, labelKey: "nav.scanner" },
    { to: "/dashboard/planner", icon: Sprout, labelKey: "nav.planner" },
    { to: "/dashboard/simulator", icon: FlaskConical, labelKey: "nav.simulator" },
  ]},
  { section: "MARKETPLACE", items: [
    { to: "/dashboard/marketplace", icon: ShoppingBag, labelKey: "nav.marketplace" },
    { to: "/dashboard/verification", icon: ShieldCheck, labelKey: "nav.verification" },
  ]},
  { section: "ACCOUNT", items: [
    { to: "/dashboard/profile", icon: User, labelKey: "nav.profile" },
    { to: "/dashboard/settings", icon: Settings, labelKey: "nav.settings" },
  ]},
];

const sellerNav = [
  { section: "MARKETPLACE", items: [
    { to: "/dashboard/marketplace", icon: ShoppingBag, labelKey: "nav.marketplace" },
    { to: "/dashboard/verification", icon: ShieldCheck, labelKey: "nav.verification" },
  ]},
  { section: "ACCOUNT", items: [
    { to: "/dashboard/profile", icon: User, labelKey: "nav.profile" },
    { to: "/dashboard/settings", icon: Settings, labelKey: "nav.settings" },
  ]},
];

const consumerNav = [
  { section: "MARKETPLACE", items: [
    { to: "/dashboard/marketplace", icon: ShoppingBag, labelKey: "nav.marketplace" },
  ]},
  { section: "ACCOUNT", items: [
    { to: "/dashboard/profile", icon: User, labelKey: "nav.profile" },
    { to: "/dashboard/settings", icon: Settings, labelKey: "nav.settings" },
  ]},
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useSettings();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<any>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const profileRefresh = useDataRefresh("profiles");
  const alertsRefresh = useDataRefresh("alerts", "scans");

  // Select nav items based on role
  const navItems = role === "seed_seller" ? sellerNav :
                   role === "consumer" ? consumerNav : farmerNav;

  // Redirect non-farmers away from farmer-only pages on mount
  useEffect(() => {
    if (!role || role === "farmer") return;
    const farmerOnlyPaths = ["/dashboard/weather", "/dashboard/market", "/dashboard/scanner", "/dashboard/planner", "/dashboard/simulator", "/dashboard/active-crops"];
    if (farmerOnlyPaths.some(p => location.pathname.startsWith(p))) {
      navigate("/dashboard/marketplace", { replace: true });
    }
    // For non-farmer roles, redirect /dashboard to /dashboard/marketplace
    if (location.pathname === "/dashboard") {
      navigate("/dashboard/marketplace", { replace: true });
    }
  }, [role, location.pathname, navigate]);

  // Load profile and unread count
  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(setProfile).catch(console.error);
    getUnreadAlertCount(user.id).then(setUnreadAlerts).catch(console.error);
  }, [user, profileRefresh, alertsRefresh]);

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    setAlertsLoading(true);
    try {
      const data = await getAlerts(user.id);
      setAlerts(data);
      setUnreadAlerts(data.filter((a: any) => !a.read).length);
    } catch { /* ignore */ }
    finally { setAlertsLoading(false); }
  }, [user]);

  useEffect(() => {
    if (alertsOpen) loadAlerts();
  }, [alertsOpen, loadAlerts]);

  const handleMarkRead = async (id: string) => {
    await markAlertRead(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setUnreadAlerts(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAlertsRead(user.id);
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setUnreadAlerts(0);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail;
      setProfile((p: any) => p ? { ...p, avatar_url: url } : p);
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setProfile((p: any) => p ? { ...p, ...data } : data);
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      setUnreadAlerts((e as CustomEvent).detail);
    };
    window.addEventListener("alerts-updated", handler);
    return () => window.removeEventListener("alerts-updated", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const displayName = profile?.full_name || user?.email || "User";
  const displayDistrict = profile?.district || "";
  const roleLabel = role === "seed_seller" ? "Seed Seller" : role === "consumer" ? "Consumer" : "Farmer";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        className="flex flex-col border-r border-sidebar-border bg-sidebar"
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.2 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <img src={logoImg} alt="Agro-Pivot" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-sidebar-primary">Agro-Pivot</h1>
              <p className="text-[10px] text-sidebar-foreground">Intelligence Platform</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {navItems.map((group) => (
            <div key={group.section}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-sidebar-foreground/60 uppercase tracking-widest px-3 mb-2">
                  {group.section}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={(item as any).end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border">
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-9 w-9 border border-sidebar-border">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
                <AvatarFallback className="bg-sidebar-accent text-sidebar-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-primary truncate">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground">{roleLabel}{displayDistrict ? ` • ${displayDistrict}` : ""}</p>
              </div>
              <button onClick={handleSignOut} className="text-sidebar-foreground hover:text-destructive transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card">
          <div className="flex items-center gap-3 flex-1">
            {location.pathname !== "/dashboard" && location.pathname !== "/dashboard/marketplace" && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary/30 px-3 py-2 rounded-lg"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search anything..."
                className="w-full bg-secondary/30 border border-border/30 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-primary font-medium px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              ● All Systems Operational
            </span>
            <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  {unreadAlerts > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {unreadAlerts > 99 ? "99+" : unreadAlerts}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 max-h-[420px] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
                  {unreadAlerts > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[11px] text-primary hover:text-primary/80 font-medium">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {alertsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {alerts.slice(0, 10).map((alert: any) => {
                        const iconMap: Record<string, any> = { Weather: CloudRain, Market: TrendingUp, "Crop Health": Camera, Scan: Camera };
                        const Icon = iconMap[alert.alert_type] || AlertTriangle;
                        return (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/20 ${!alert.read ? "bg-primary/[0.03]" : ""}`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              alert.severity === "high" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                            }`}>
                              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug ${!alert.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{alert.title}</p>
                              {alert.message && <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{alert.message}</p>}
                              <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(alert.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            {!alert.read && (
                              <button onClick={() => handleMarkRead(alert.id)} className="p-1 rounded hover:bg-secondary/40 text-muted-foreground/50 hover:text-primary flex-shrink-0">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {alerts.length > 0 && (
                  <div className="border-t border-border/40 px-4 py-2.5">
                    <button
                      onClick={() => { setAlertsOpen(false); navigate("/dashboard/alerts"); }}
                      className="text-[11px] text-primary hover:text-primary/80 font-medium w-full text-center"
                    >
                      View all notifications →
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <NavLink
              to="/dashboard/settings"
              className="p-2 rounded-lg hover:bg-secondary/30 transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Floating Assistant */}
      <FloatingChatbot />
    </div>
  );
}
