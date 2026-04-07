import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import {
  User, Bell, Globe, Shield, Palette, Thermometer,
  Mail, Smartphone, Clock, Sun, Moon,
  Save, Languages, Wheat, Type, Camera, Loader2, Upload, Pencil, Monitor, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MALAYSIA_STATES, STATE_LIST } from "@/lib/malaysiaLocations";

type Tab = "profile" | "notifications" | "display" | "regional" | "farm" | "privacy";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, fontSize, setFontSize, language, setLanguage, t } = useSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    name: "", email: "", phone: "",
  });

  const [farm, setFarm] = useState({
    farmName: "", district: "", state: "",
    acreage: "", primaryCrop: "", secondaryCrops: "", soilType: "",
    currentCrops: "", preferredCrops: "", farmType: "", irrigationType: "",
  });

  const farmDistricts = MALAYSIA_STATES[farm.state] || [];

  const [notifications, setNotifications] = useState({
    weatherAlerts: true, marketUpdates: true, cropAdvisory: true, seedScanResults: true,
    emailDigest: false, inAppAlerts: true, soundEnabled: true,
    quietHoursStart: "22:00", quietHoursEnd: "06:00",
  });

  const [display, setDisplay] = useState({ compactMode: false, animationsEnabled: true });

  const [regional, setRegional] = useState({
    temperatureUnit: "celsius" as "celsius" | "fahrenheit",
    dateFormat: "DD/MM/YYYY", timezone: "Asia/Kuala_Lumpur", currency: "MYR",
  });

  const [privacy, setPrivacy] = useState({
    shareLocationData: true, analyticsOptIn: true, publicProfile: false,
    twoFactorAuth: false, dataExportEnabled: true,
  });

  // Load profile + settings from database
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setProfile({ name: data.full_name || "", email: data.email || "", phone: data.phone || "" });
        setAvatarUrl(data.avatar_url || "");
        setFarm(f => ({
          ...f,
          farmName: data.farm_name || "",
          district: data.district || "",
          state: data.state || "",
          acreage: String(data.acreage || ""),
          primaryCrop: data.primary_crop || "",
          secondaryCrops: data.secondary_crops || "",
          soilType: data.soil_type || "",
          currentCrops: data.current_crops || "",
          preferredCrops: data.preferred_crops || "",
          farmType: data.farm_type || "",
          irrigationType: data.irrigation_type || "",
        }));
      }
      const { data: settingsData } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (settingsData) {
        const data = settingsData;
        setNotifications(n => ({
          ...n,
          weatherAlerts: data.weather_alerts ?? n.weatherAlerts,
          marketUpdates: data.market_updates ?? n.marketUpdates,
          cropAdvisory: data.crop_advisory ?? n.cropAdvisory,
          seedScanResults: data.seed_scan_results ?? n.seedScanResults,
          emailDigest: data.email_digest ?? n.emailDigest,
          inAppAlerts: true,
          soundEnabled: data.sound_effects ?? n.soundEnabled,
          quietHoursStart: data.quiet_hours_start || n.quietHoursStart,
          quietHoursEnd: data.quiet_hours_end || n.quietHoursEnd,
        }));
        setRegional(r => ({
          ...r,
          temperatureUnit: (data.temp_unit as any) || r.temperatureUnit,
          dateFormat: data.date_format || r.dateFormat,
          timezone: data.timezone || r.timezone,
          currency: data.currency || r.currency,
        }));
        setPrivacy(p => ({
          ...p,
          shareLocationData: data.share_location ?? p.shareLocationData,
          analyticsOptIn: data.analytics_opt_in ?? p.analyticsOptIn,
          publicProfile: data.public_profile ?? p.publicProfile,
          twoFactorAuth: data.two_factor ?? p.twoFactorAuth,
          dataExportEnabled: data.data_export ?? p.dataExportEnabled,
        }));
      }
    };
    loadData();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 2MB allowed.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    const filePath = `${user.id}/avatar.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
    window.dispatchEvent(new CustomEvent("avatar-updated", { detail: publicUrl }));
    toast({ title: "Profile picture updated!" });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({
      full_name: profile.name, email: profile.email, phone: profile.phone, updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setSaving(false);
    window.dispatchEvent(new CustomEvent("profile-updated", { detail: { full_name: profile.name } }));
    triggerDataRefresh("profiles");
    toast({ title: t("settings.saved"), description: t("settings.savedDesc") });
  };

  const handleSaveFarm = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({
      farm_name: farm.farmName, district: farm.district, state: farm.state,
      acreage: parseFloat(farm.acreage) || 0, primary_crop: farm.primaryCrop,
      secondary_crops: farm.secondaryCrops, soil_type: farm.soilType,
      current_crops: farm.currentCrops || null, preferred_crops: farm.preferredCrops || null,
      farm_type: farm.farmType || null, irrigation_type: farm.irrigationType || null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setSaving(false);
    window.dispatchEvent(new CustomEvent("profile-updated", { detail: { district: farm.district, state: farm.state } }));
    triggerDataRefresh("profiles");
    toast({ title: t("settings.saved"), description: t("settings.savedDesc") });
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("user_settings").update({
      weather_alerts: notifications.weatherAlerts, market_updates: notifications.marketUpdates,
      crop_advisory: notifications.cropAdvisory, seed_scan_results: notifications.seedScanResults,
      email_digest: notifications.emailDigest, sms_alerts: false,
      sound_effects: notifications.soundEnabled, quiet_hours_start: notifications.quietHoursStart,
      quiet_hours_end: notifications.quietHoursEnd, updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setSaving(false);
    toast({ title: t("settings.saved"), description: t("settings.savedDesc") });
  };

  const handleSaveRegional = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("user_settings").update({
      temp_unit: regional.temperatureUnit, date_format: regional.dateFormat,
      timezone: regional.timezone, currency: regional.currency, updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setSaving(false);
    toast({ title: t("settings.saved"), description: t("settings.savedDesc") });
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("user_settings").update({
      share_location: privacy.shareLocationData, analytics_opt_in: privacy.analyticsOptIn,
      public_profile: privacy.publicProfile, two_factor: privacy.twoFactorAuth,
      data_export: privacy.dataExportEnabled, updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setSaving(false);
    toast({ title: t("settings.saved"), description: t("settings.savedDesc") });
  };

  const tabs = [
    { id: "profile" as Tab, label: t("settings.profile"), icon: User },
    { id: "farm" as Tab, label: t("settings.farm"), icon: Wheat },
    { id: "notifications" as Tab, label: t("settings.notifications"), icon: Bell },
    { id: "display" as Tab, label: t("settings.display"), icon: Palette },
    { id: "regional" as Tab, label: t("settings.regional"), icon: Globe },
    { id: "privacy" as Tab, label: t("settings.privacy"), icon: Shield },
  ];

  const initials = profile.name ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-display text-2xl mb-1">{t("settings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="md:w-56 flex-shrink-0 self-start space-y-4">
          <GlassCard className="p-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="relative group">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">{initials}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="text-sm font-semibold">{profile.name || "Your Name"}</p>
                <p className="text-xs text-muted-foreground">Farmer</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-2">
            <nav className="flex md:flex-col gap-0.5 overflow-x-auto md:overflow-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all w-full text-left ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <tab.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </GlassCard>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>

            {activeTab === "profile" && (
              <GlassCard className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{t("settings.profile")}</h3>
                    <p className="text-xs text-muted-foreground">Manage your personal information</p>
                  </div>
                </div>

                {/* Avatar Upload Row */}
                <div className="flex items-center gap-5 p-4 rounded-xl bg-secondary/20 border border-border/30">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 border-2 border-border/50">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile" /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">{initials}</AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Profile Picture</p>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG or PNG. Max 2MB.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="mt-2 gap-2 text-xs h-8"
                    >
                      {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {avatarUrl ? "Change Photo" : "Upload Photo"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput label={t("settings.fullName")} value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} icon={<User className="h-4 w-4" />} />
                  <FieldInput label={t("settings.email")} value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} icon={<Mail className="h-4 w-4" />} />
                  <FieldInput label={t("settings.phone")} value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} icon={<Smartphone className="h-4 w-4" />} />
                </div>
                <SaveButton label={t("settings.save")} onClick={handleSaveProfile} saving={saving} />
              </GlassCard>
            )}

            {activeTab === "farm" && (
              <GlassCard className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wheat className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{t("settings.farm")}</h3>
                    <p className="text-xs text-muted-foreground">Your farm details and crop information</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput label={t("settings.farmName")} value={farm.farmName} onChange={(v) => setFarm({ ...farm, farmName: v })} icon={<Wheat className="h-4 w-4" />} />
                  {/* State dropdown */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{t("settings.state")}</label>
                    <Select value={farm.state || "__none__"} onValueChange={(v) => {
                      if (v === "__none__") { setFarm({ ...farm, state: "", district: "" }); return; }
                      const firstDistrict = MALAYSIA_STATES[v]?.[0] || "";
                      setFarm({ ...farm, state: v, district: firstDistrict });
                    }}>
                      <SelectTrigger className="w-full bg-secondary/20 border-border/40">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Select state —</SelectItem>
                        {STATE_LIST.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* District dropdown */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{t("settings.district")}</label>
                    <Select value={farm.district || "__none__"} onValueChange={(v) => setFarm({ ...farm, district: v === "__none__" ? "" : v })}>
                      <SelectTrigger className="w-full bg-secondary/20 border-border/40">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Select district —</SelectItem>
                        {farmDistricts.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldInput label={t("settings.acreage")} value={farm.acreage} onChange={(v) => setFarm({ ...farm, acreage: v })} />
                  <CropMultiSelect
                    label="Current Crops"
                    value={farm.currentCrops}
                    onChange={(v) => setFarm({ ...farm, currentCrops: v })}
                    icon={<Wheat className="h-4 w-4" />}
                  />
                  <CropMultiSelect
                    label="Preferred Crops"
                    value={farm.preferredCrops}
                    onChange={(v) => setFarm({ ...farm, preferredCrops: v })}
                  />
                  <CropDropdown
                    label={t("settings.primaryCrop")}
                    value={farm.primaryCrop}
                    options={farm.currentCrops ? farm.currentCrops.split(",").map(c => c.trim()).filter(Boolean) : []}
                    onChange={(v) => setFarm({ ...farm, primaryCrop: v })}
                    placeholder="Select from your current crops"
                    icon={<Wheat className="h-4 w-4" />}
                  />
                  <CropMultiSelect
                    label={t("settings.secondaryCrops")}
                    value={farm.secondaryCrops}
                    sourceOptions={farm.currentCrops ? farm.currentCrops.split(",").map(c => c.trim()).filter(c => c && c !== farm.primaryCrop) : []}
                  onChange={(v) => setFarm({ ...farm, secondaryCrops: v })}
                  />
                  <FieldSelect label={t("settings.soilType")} value={farm.soilType} options={["Clay Loam", "Sandy Loam", "Sandy", "Silt Loam", "Peat", "Alluvial"]} onChange={(v) => setFarm({ ...farm, soilType: v })} />
                  <FieldSelect label="Farm Type" value={farm.farmType} options={["paddy", "vegetables", "mixed", "fruits", "other"]} onChange={(v) => setFarm({ ...farm, farmType: v })} />
                  <FieldSelect label="Irrigation Type" value={farm.irrigationType} options={["rain_fed", "irrigation", "drip", "unknown"]} onChange={(v) => setFarm({ ...farm, irrigationType: v })} />
                </div>
                <SaveButton label={t("settings.save")} onClick={handleSaveFarm} saving={saving} />
              </GlassCard>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <GlassCard className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bell className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{t("settings.alertTypes")}</h3>
                      <p className="text-xs text-muted-foreground">Choose which alerts you receive</p>
                    </div>
                  </div>
                  <div className="divide-y divide-border/30">
                    <ToggleRow label={t("settings.weatherAlerts")} desc={t("settings.weatherAlertsDesc")} checked={notifications.weatherAlerts} onChange={(v) => setNotifications({ ...notifications, weatherAlerts: v })} />
                    <ToggleRow label={t("settings.marketUpdates")} desc={t("settings.marketUpdatesDesc")} checked={notifications.marketUpdates} onChange={(v) => setNotifications({ ...notifications, marketUpdates: v })} />
                    <ToggleRow label={t("settings.cropAdvisory")} desc={t("settings.cropAdvisoryDesc")} checked={notifications.cropAdvisory} onChange={(v) => setNotifications({ ...notifications, cropAdvisory: v })} />
                    <ToggleRow label={t("settings.seedScanResults")} desc={t("settings.seedScanResultsDesc")} checked={notifications.seedScanResults} onChange={(v) => setNotifications({ ...notifications, seedScanResults: v })} />
                  </div>
                </GlassCard>
                <GlassCard className="p-6 space-y-4">
                  <SectionTitle icon={<Mail className="h-4 w-4 text-primary" />}>{t("settings.delivery")}</SectionTitle>
                  <div className="divide-y divide-border/30">
                    <ToggleRow label={t("settings.emailDigest")} desc={t("settings.emailDigestDesc")} checked={notifications.emailDigest} onChange={(v) => setNotifications({ ...notifications, emailDigest: v })} />
                    <ToggleRow label={t("settings.inAppAlerts")} desc={t("settings.inAppAlertsDesc")} checked={notifications.inAppAlerts} onChange={(v) => setNotifications({ ...notifications, inAppAlerts: v })} />
                    <ToggleRow label={t("settings.soundEffects")} desc={t("settings.soundEffectsDesc")} checked={notifications.soundEnabled} onChange={(v) => setNotifications({ ...notifications, soundEnabled: v })} />
                  </div>
                </GlassCard>
                <GlassCard className="p-6 space-y-4">
                  <SectionTitle icon={<Clock className="h-4 w-4 text-primary" />}>{t("settings.quietHours")}</SectionTitle>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldInput label={t("settings.start")} value={notifications.quietHoursStart} onChange={(v) => setNotifications({ ...notifications, quietHoursStart: v })} icon={<Clock className="h-4 w-4" />} />
                    <FieldInput label={t("settings.end")} value={notifications.quietHoursEnd} onChange={(v) => setNotifications({ ...notifications, quietHoursEnd: v })} icon={<Clock className="h-4 w-4" />} />
                  </div>
                  <SaveButton label={t("settings.save")} onClick={handleSaveNotifications} saving={saving} />
                </GlassCard>
              </div>
            )}

            {activeTab === "display" && (
              <div className="space-y-4">
                <GlassCard className="p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Palette className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{t("settings.theme")}</h3>
                      <p className="text-xs text-muted-foreground">Choose your preferred appearance</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: "light" as const, label: t("settings.light"), icon: Sun, desc: "Clean & bright" },
                      { value: "dark" as const, label: t("settings.dark"), icon: Moon, desc: "Easy on eyes" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                          theme === opt.value
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/40 hover:bg-secondary/30 hover:border-border"
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${theme === opt.value ? "bg-primary/20" : "bg-secondary/50"}`}>
                          <opt.icon className={`h-5 w-5 ${theme === opt.value ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${theme === opt.value ? "text-primary" : ""}`}>{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-6 space-y-5">
                  <SectionTitle icon={<Type className="h-4 w-4 text-primary" />}>{t("settings.fontSizeLabel")}</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "small" as const, label: t("settings.small"), preview: "Aa", size: "text-sm" },
                      { value: "medium" as const, label: t("settings.medium"), preview: "Aa", size: "text-lg" },
                      { value: "large" as const, label: t("settings.large"), preview: "Aa", size: "text-xl" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFontSize(opt.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          fontSize === opt.value
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/40 hover:bg-secondary/30 hover:border-border"
                        }`}
                      >
                        <span className={`font-serif font-bold ${opt.size} ${fontSize === opt.value ? "text-primary" : "text-muted-foreground"}`}>{opt.preview}</span>
                        <span className={`text-xs font-medium ${fontSize === opt.value ? "text-primary" : "text-muted-foreground"}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-6 space-y-4">
                  <SectionTitle icon={<Monitor className="h-4 w-4 text-primary" />}>Interface</SectionTitle>
                  <div className="divide-y divide-border/30">
                    <ToggleRow label={t("settings.compactMode")} desc={t("settings.compactModeDesc")} checked={display.compactMode} onChange={(v) => setDisplay({ ...display, compactMode: v })} />
                    <ToggleRow label={t("settings.animations")} desc={t("settings.animationsDesc")} checked={display.animationsEnabled} onChange={(v) => setDisplay({ ...display, animationsEnabled: v })} />
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "regional" && (
              <GlassCard className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{t("settings.regional")}</h3>
                    <p className="text-xs text-muted-foreground">Language, units, and format preferences</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-2.5 flex items-center gap-2 font-medium">
                    <Languages className="h-4 w-4" strokeWidth={1.5} />
                    {t("settings.language")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { v: "en", l: "English", flag: "🇬🇧" },
                      { v: "ms", l: "Bahasa Melayu", flag: "🇲🇾" },
                      { v: "zh", l: "中文", flag: "🇨🇳" },
                      { v: "ta", l: "தமிழ்", flag: "🇮🇳" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => setLanguage(opt.v)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl text-sm border-2 transition-all ${
                          language === opt.v
                            ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                            : "border-border/40 text-muted-foreground hover:bg-secondary/30 hover:border-border"
                        }`}
                      >
                        <span className="text-lg">{opt.flag}</span>
                        <span>{opt.l}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldSelect label={t("settings.tempUnit")} value={regional.temperatureUnit} options={[{ v: "celsius", l: "Celsius (°C)" }, { v: "fahrenheit", l: "Fahrenheit (°F)" }]} onChange={(v) => setRegional({ ...regional, temperatureUnit: v as any })} icon={<Thermometer className="h-4 w-4" />} />
                  <FieldSelect label={t("settings.dateFormat")} value={regional.dateFormat} options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} onChange={(v) => setRegional({ ...regional, dateFormat: v })} />
                  <FieldInput label={t("settings.timezone")} value={regional.timezone} onChange={(v) => setRegional({ ...regional, timezone: v })} icon={<Clock className="h-4 w-4" />} />
                  <FieldInput label={t("settings.currency")} value={regional.currency} onChange={(v) => setRegional({ ...regional, currency: v })} />
                </div>
                <SaveButton label={t("settings.save")} onClick={handleSaveRegional} saving={saving} />
              </GlassCard>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <GlassCard className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{t("settings.privacy")}</h3>
                      <p className="text-xs text-muted-foreground">Control your data and privacy preferences</p>
                    </div>
                  </div>
                  <div className="divide-y divide-border/30">
                    <ToggleRow label={t("settings.shareLocation")} desc={t("settings.shareLocationDesc")} checked={privacy.shareLocationData} onChange={(v) => setPrivacy({ ...privacy, shareLocationData: v })} />
                    <ToggleRow label={t("settings.analyticsOptIn")} desc={t("settings.analyticsOptInDesc")} checked={privacy.analyticsOptIn} onChange={(v) => setPrivacy({ ...privacy, analyticsOptIn: v })} />
                    <ToggleRow label={t("settings.publicProfile")} desc={t("settings.publicProfileDesc")} checked={privacy.publicProfile} onChange={(v) => setPrivacy({ ...privacy, publicProfile: v })} />
                    <ToggleRow label={t("settings.twoFactor")} desc={t("settings.twoFactorDesc")} checked={privacy.twoFactorAuth} onChange={(v) => setPrivacy({ ...privacy, twoFactorAuth: v })} />
                    <ToggleRow label={t("settings.dataExport")} desc={t("settings.dataExportDesc")} checked={privacy.dataExportEnabled} onChange={(v) => setPrivacy({ ...privacy, dataExportEnabled: v })} />
                  </div>
                  <SaveButton label={t("settings.save")} onClick={handleSavePrivacy} saving={saving} />
                </GlassCard>
                <GlassCard className="p-6 space-y-4">
                  <SectionTitle icon={<Shield className="h-4 w-4 text-primary" />}>{t("settings.accountActions")}</SectionTitle>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => toast({ title: t("settings.exportData"), description: "You will receive a download link via email." })}>
                      <Save className="h-3.5 w-3.5" />
                      {t("settings.exportData")}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => navigate("/delete-account")}>
                      {t("settings.deleteAccount")}
                    </Button>
                  </div>
                </GlassCard>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-semibold">{children}</h3>
    </div>
  );
}

function FieldInput({ label, value, onChange, icon }: { label: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">{icon}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-secondary/20 border border-border/40 rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all ${icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}

function FieldSelect({ label, value, options, onChange, icon }: { label: string; value: string; options: (string | { v: string; l: string })[]; onChange: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">{icon}</span>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-secondary/20 border border-border/40 rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none ${icon ? "pl-9 pr-3" : "px-3"}`}
        >
          {options.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.v;
            const l = typeof opt === "string" ? opt : opt.l;
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5 px-1">
      <div className="min-w-0 mr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SaveButton({ label, onClick, saving }: { label: string; onClick: () => void; saving?: boolean }) {
  return (
    <div className="pt-5 flex justify-end border-t border-border/30">
      <Button onClick={onClick} disabled={saving} className="gap-2 min-w-[120px]">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
        {saving ? "Saving..." : label}
      </Button>
    </div>
  );
}

const DEFAULT_CROP_OPTIONS = ["Padi", "Corn", "Chili", "Tomato", "Cucumber", "Ginger", "Mung Bean", "Soybean", "Tapioca", "Oil Palm", "Rubber", "Coconut", "Durian", "Banana"];

function CropMultiSelect({ label, value, onChange, icon, sourceOptions }: {
  label: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode;
  sourceOptions?: string[];
}) {
  const [customCrops, setCustomCrops] = React.useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customName, setCustomName] = React.useState("");

  const selected = value ? value.split(",").map(c => c.trim()).filter(Boolean) : [];
  const options = [...(sourceOptions || DEFAULT_CROP_OPTIONS), ...customCrops];
  const available = options.filter(c => !selected.includes(c));

  const addCrop = (crop: string) => {
    if (crop === "__add_custom__") {
      setShowCustomInput(true);
      return;
    }
    const next = [...selected, crop].join(", ");
    onChange(next);
  };
  const removeCrop = (crop: string) => {
    const next = selected.filter(c => c !== crop).join(", ");
    onChange(next);
  };
  const addCustomCrop = () => {
    const trimmed = customName.trim();
    if (trimmed && !options.includes(trimmed) && !selected.includes(trimmed)) {
      setCustomCrops(prev => [...prev, trimmed]);
      const next = [...selected, trimmed].join(", ");
      onChange(next);
    }
    setCustomName("");
    setShowCustomInput(false);
  };

  return (
    <div className="col-span-full">
      <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        {label}
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(c => (
            <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              {c}
              <button onClick={() => removeCrop(c)} className="hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {showCustomInput ? (
        <div className="flex gap-2">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter crop name..."
            className="bg-secondary/20 border-border/40"
            onKeyDown={(e) => e.key === "Enter" && addCustomCrop()}
            autoFocus
          />
          <Button size="sm" onClick={addCustomCrop} disabled={!customName.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowCustomInput(false); setCustomName(""); }}>Cancel</Button>
        </div>
      ) : (
        <Select onValueChange={addCrop} value={undefined}>
          <SelectTrigger className="w-full bg-secondary/20 border-border/40">
            <SelectValue placeholder={`Add ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {available.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            <SelectSeparator />
            <SelectItem value="__add_custom__">➕ Add custom crop...</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function CropDropdown({ label, value, options, onChange, placeholder, icon }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
  placeholder?: string; icon?: React.ReactNode;
}) {
  const [customCrops, setCustomCrops] = React.useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customName, setCustomName] = React.useState("");

  const allOptions = [...options, ...customCrops].filter(c => c);

  const handleChange = (v: string) => {
    if (v === "__add_custom__") {
      setShowCustomInput(true);
      return;
    }
    onChange(v === "__none__" ? "" : v);
  };

  const addCustomCrop = () => {
    const trimmed = customName.trim();
    if (trimmed && !allOptions.includes(trimmed)) {
      setCustomCrops(prev => [...prev, trimmed]);
      onChange(trimmed);
    }
    setCustomName("");
    setShowCustomInput(false);
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        {label}
      </label>
      {showCustomInput ? (
        <div className="flex gap-2">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter crop name..."
            className="bg-secondary/20 border-border/40"
            onKeyDown={(e) => e.key === "Enter" && addCustomCrop()}
            autoFocus
          />
          <Button size="sm" onClick={addCustomCrop} disabled={!customName.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowCustomInput(false); setCustomName(""); }}>Cancel</Button>
        </div>
      ) : (
        <Select value={value || "__none__"} onValueChange={handleChange}>
          <SelectTrigger className="w-full bg-secondary/20 border-border/40">
            <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— None —</SelectItem>
            {allOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            <SelectSeparator />
            <SelectItem value="__add_custom__">➕ Add custom crop...</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
