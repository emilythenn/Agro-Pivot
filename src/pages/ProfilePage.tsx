import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { User, MapPin, Wheat, Sprout, Mail, Smartphone, Loader2, Camera, Upload, Pencil, FlaskConical, Droplets, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, activeCrops, allCrops, loading } = useUserProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "File too large", description: "Max 2MB.", variant: "destructive" }); return; }
    setUploading(true);
    const filePath = `${user.id}/avatar.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setUploading(false);
    window.dispatchEvent(new CustomEvent("avatar-updated", { detail: publicUrl }));
    window.dispatchEvent(new CustomEvent("profile-updated"));
    triggerDataRefresh("profiles");
    toast({ title: "Profile picture updated!" });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const initials = profile.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  const historicalIssues = profile.historical_issues ? profile.historical_issues.split(",").map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold font-serif text-foreground mb-1">My Profile</h2>
        <p className="text-sm text-muted-foreground">Your farm profile and preferences synced across the platform</p>
      </motion.div>

      {/* Profile Header */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="Profile" /> : null}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">{initials}</AvatarFallback>
            </Avatar>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">{profile.full_name || "—"}</h3>
            <p className="text-sm text-muted-foreground">{profile.farm_name || "Farm"} • {profile.district}, {profile.state}</p>
            <p className="text-xs text-muted-foreground mt-1">{profile.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/settings")} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> Edit Profile
          </Button>
        </div>
      </GlassCard>

      {/* Personal Info */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Full Name" value={profile.full_name} icon={<User className="h-3.5 w-3.5" />} />
          <InfoRow label="Email" value={profile.email} icon={<Mail className="h-3.5 w-3.5" />} />
          <InfoRow label="Phone" value={profile.phone} icon={<Smartphone className="h-3.5 w-3.5" />} />
        </div>
      </GlassCard>

      {/* Farm Details */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">Farm Details</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Farm Name" value={profile.farm_name} />
          <InfoRow label="Location" value={`${profile.district}, ${profile.state}`} icon={<MapPin className="h-3.5 w-3.5" />} />
          <InfoRow label="Farm Size" value={profile.acreage ? `${profile.acreage} acres` : null} />
          <InfoRow label="Farm Type" value={profile.farm_type} />
          <InfoRow label="Irrigation" value={profile.irrigation_type} />
          <InfoRow label="Soil Type" value={profile.soil_type} />
          <InfoRow label="Soil pH" value={profile.soil_type ? String(profile.soil_type) : null} />
          <InfoRow label="Drainage" value={profile.drainage_condition} />
          <InfoRow label="Flood Risk" value={profile.flood_risk} />
          {profile.gps_lat && <InfoRow label="GPS" value={`${profile.gps_lat?.toFixed(4)}, ${profile.gps_lng?.toFixed(4)}`} />}
        </div>
      </GlassCard>

      {/* Crops */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sprout className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">Crops & Preferences</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Active Crops</p>
            <div className="flex flex-wrap gap-2">
              {activeCrops.length > 0 ? activeCrops.map(c => (
                <span key={c} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">{c}</span>
              )) : <span className="text-xs text-muted-foreground">No crops set</span>}
            </div>
          </div>
          {allCrops.length > activeCrops.length && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Preferred / Secondary Crops</p>
              <div className="flex flex-wrap gap-2">
                {allCrops.filter(c => !activeCrops.includes(c)).map(c => (
                  <span key={c} className="px-3 py-1.5 rounded-full bg-secondary/60 text-muted-foreground text-xs font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm pt-2">
            <InfoRow label="Planting Season" value={profile.planting_season} />
            <InfoRow label="Farming Style" value={profile.farming_style} />
            <InfoRow label="Risk Tolerance" value={profile.risk_tolerance} />
          </div>
        </div>
      </GlassCard>

      {/* Economic */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">Economic Profile</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Budget / Season" value={profile.budget_per_season ? `RM ${profile.budget_per_season.toLocaleString()}` : null} />
          <InfoRow label="Yield Target" value={profile.expected_yield_target} />
          <InfoRow label="Selling Method" value={profile.selling_method} />
          <InfoRow label="Main Income from Crops" value={profile.main_crop_income ? "Yes" : "No"} />
        </div>
      </GlassCard>

      {/* Historical Issues */}
      {historicalIssues.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-foreground">Historical Issues</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {historicalIssues.map(issue => (
              <span key={issue} className="px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/20">{issue}</span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}
