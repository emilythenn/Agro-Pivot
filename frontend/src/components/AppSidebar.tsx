import { useState, useEffect } from "react";
import {
  Cloud, BarChart3, Sprout, Camera, LogOut,
  User, LayoutDashboard, FileText, Leaf, ChevronLeft, ChevronRight, FlaskConical
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useSettings } from "@/contexts/SettingsContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useSettings();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [profileRole, setProfileRole] = useState<string>("farmer");
  const [profileState, setProfileState] = useState<string>("Kedah");
  const [profileDistrict, setProfileDistrict] = useState<string>("Kota Setar");

  const roleLabels: Record<string, string> = {
    farmer: "Farmer",
    agronomist: "Agronomist",
    admin: "Administrator",
    policy_analyst: "Policy Analyst",
  };

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url, role, state, district").eq("id", user.id).single().then(({ data }) => {
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      if (data?.role) setProfileRole(data.role);
      if (data?.state) setProfileState(data.state);
      if (data?.district) setProfileDistrict(data.district);
    });
  }, [user]);

  // Listen for avatar updates from Settings page
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail;
      if (url) setAvatarUrl(url);
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { role?: string; state?: string; district?: string } | undefined;
      if (!detail) return;
      if (detail.role) setProfileRole(detail.role);
      if (detail.state) setProfileState(detail.state);
      if (detail.district) setProfileDistrict(detail.district);
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Farmer";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const mainNav = [
    { title: t("nav.overview"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.weather"), url: "/dashboard/weather", icon: Cloud },
    { title: t("nav.market"), url: "/dashboard/market", icon: BarChart3 },
    { title: t("nav.crops"), url: "/dashboard/crops", icon: Sprout },
  ];

  const integrityNav = [
    { title: t("nav.scanner"), url: "/dashboard/scanner", icon: Camera },
    { title: t("nav.evidence"), url: "/dashboard/evidence", icon: FileText },
    { title: t("nav.planner"), url: "/dashboard/planner", icon: Leaf },
    { title: t("nav.simulator"), url: "/dashboard/simulator", icon: FlaskConical },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <img src={logoImg} alt="Agro-Pivot" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold tracking-tight truncate text-sidebar-primary">Agro-Pivot</h1>
              <p className="text-[10px] text-sidebar-foreground/70 truncate">Intelligence Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1">
            {!collapsed ? t("nav.advisory") : "—"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent transition-all"
                      activeClassName="bg-sidebar-accent text-sidebar-primary-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground">
                      <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1">
            {!collapsed ? t("nav.seedIntegrity") : "—"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrityNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent transition-all"
                      activeClassName="bg-sidebar-accent text-sidebar-primary-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground">
                      <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/dashboard/settings")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/dashboard/settings");
              }
            }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg bg-secondary/20 mb-2 hover:bg-secondary/30 transition-colors text-left"
          >
            <Avatar className="h-8 w-8 flex-shrink-0 border border-border/30">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium truncate text-sidebar-primary">{displayName}</p>
              <p className="text-[10px] text-sidebar-foreground/70 truncate">{roleLabels[profileRole] || profileRole} • {profileDistrict}, {profileState}</p>
            </div>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await signOut();
                navigate("/");
              }}
              className="p-1 rounded hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 text-sidebar-foreground" strokeWidth={1.5} />
            </button>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-2">
            <Avatar className="h-8 w-8 border border-border/30">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={1.5} /> : <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
