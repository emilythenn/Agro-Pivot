import { GlassCard } from "@/components/GlassCard";
import { Wheat, Droplets, DollarSign, ShieldCheck, MapPin, Sprout } from "lucide-react";
import type { UserProfile } from "@/hooks/useUserProfile";
import type { FarmContext } from "@/lib/api";

export function profileToFarmContext(profile: UserProfile): FarmContext {
  return {
    district: profile.district,
    state: profile.state,
    farm_name: profile.farm_name,
    acreage: profile.acreage,
    soil_type: profile.soil_type,
    farm_type: profile.farm_type,
    irrigation_type: profile.irrigation_type,
    farming_style: profile.farming_style,
    risk_tolerance: profile.risk_tolerance,
    flood_risk: profile.flood_risk,
    drainage_condition: profile.drainage_condition,
    budget_per_season: profile.budget_per_season,
    expected_yield_target: profile.expected_yield_target,
    selling_method: profile.selling_method,
    main_crop_income: profile.main_crop_income,
    planting_season: profile.planting_season,
    current_crops: profile.current_crops,
    preferred_crops: profile.preferred_crops,
    primary_crop: profile.primary_crop,
    secondary_crops: profile.secondary_crops,
    historical_issues: profile.historical_issues,
  };
}

interface FarmContextBannerProps {
  profile: UserProfile;
  activeCrops: string[];
  compact?: boolean;
}

export function FarmContextBanner({ profile, activeCrops, compact = false }: FarmContextBannerProps) {
  if (compact) {
    return (
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /><span className="font-medium text-foreground">{profile.farm_name || "Farm"}</span> — {profile.district}, {profile.state}</span>
          <span className="flex items-center gap-1.5"><Wheat className="h-3.5 w-3.5 text-primary" />{profile.acreage || "—"} acres • {profile.soil_type || "—"}</span>
          <span className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-accent" />{profile.irrigation_type || "—"} • Flood: {profile.flood_risk || "—"}</span>
          <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-primary" />RM {profile.budget_per_season?.toLocaleString() || "—"}/season</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-warning" />Risk: {profile.risk_tolerance || "—"}</span>
          {activeCrops.length > 0 && (
            <span className="flex items-center gap-1.5"><Sprout className="h-3.5 w-3.5 text-primary" />{activeCrops.join(", ")}</span>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sprout className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Your Farm Profile</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <InfoItem icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={`${profile.district}, ${profile.state}`} />
        <InfoItem icon={<Wheat className="h-3.5 w-3.5" />} label="Farm Size" value={profile.acreage ? `${profile.acreage} acres` : "—"} />
        <InfoItem label="Soil Type" value={profile.soil_type || "—"} />
        <InfoItem label="Irrigation" value={profile.irrigation_type || "—"} />
        <InfoItem label="Flood Risk" value={profile.flood_risk || "—"} />
        <InfoItem icon={<DollarSign className="h-3.5 w-3.5" />} label="Budget/Season" value={profile.budget_per_season ? `RM ${profile.budget_per_season.toLocaleString()}` : "—"} />
        <InfoItem label="Risk Tolerance" value={profile.risk_tolerance || "—"} />
        <InfoItem label="Selling Method" value={profile.selling_method || "—"} />
        <InfoItem label="Farming Style" value={profile.farming_style || "—"} />
        <InfoItem label="Drainage" value={profile.drainage_condition || "—"} />
      </div>
      {activeCrops.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground mb-1.5">Active Crops</p>
          <div className="flex flex-wrap gap-1.5">
            {activeCrops.map(c => (
              <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">{c}</span>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
