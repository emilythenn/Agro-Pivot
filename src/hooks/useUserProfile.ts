import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDataRefresh } from "@/hooks/useDataRefresh";

export interface UserProfile {
  state: string;
  district: string;
  gps_lat: number | null;
  gps_lng: number | null;
  primary_crop: string | null;
  current_crops: string | null;
  preferred_crops: string | null;
  secondary_crops: string | null;
  farm_name: string | null;
  acreage: number | null;
  soil_type: string | null;
  farm_type: string | null;
  irrigation_type: string | null;
  farming_style: string | null;
  risk_tolerance: string | null;
  flood_risk: string | null;
  budget_per_season: number | null;
  full_name: string | null;
  onboarding_completed: boolean | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  drainage_condition: string | null;
  historical_issues: string | null;
  expected_yield_target: string | null;
  selling_method: string | null;
  main_crop_income: boolean | null;
  planting_season: string | null;
}

const defaultProfile: UserProfile = {
  state: "",
  district: "",
  gps_lat: null,
  gps_lng: null,
  primary_crop: null,
  current_crops: null,
  preferred_crops: null,
  secondary_crops: null,
  farm_name: null,
  acreage: null,
  soil_type: null,
  farm_type: null,
  irrigation_type: null,
  farming_style: null,
  risk_tolerance: null,
  flood_risk: null,
  budget_per_season: null,
  full_name: null,
  onboarding_completed: null,
  email: null,
  phone: null,
  avatar_url: null,
  drainage_condition: null,
  historical_issues: null,
  expected_yield_target: null,
  selling_method: null,
  main_crop_income: null,
  planting_season: null,
};

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error.message);
    }

    if (data) {
      setProfile({
        state: data.state || "",
        district: data.district || "",
        gps_lat: data.gps_lat,
        gps_lng: data.gps_lng,
        primary_crop: data.primary_crop,
        current_crops: data.current_crops,
        preferred_crops: data.preferred_crops,
        secondary_crops: data.secondary_crops,
        farm_name: data.farm_name,
        acreage: data.acreage,
        soil_type: data.soil_type,
        farm_type: data.farm_type,
        irrigation_type: data.irrigation_type,
        farming_style: data.farming_style,
        risk_tolerance: data.risk_tolerance,
        flood_risk: data.flood_risk,
        budget_per_season: data.budget_per_season,
        full_name: data.full_name,
        onboarding_completed: data.onboarding_completed,
        email: data.email,
        phone: data.phone,
        avatar_url: data.avatar_url,
        drainage_condition: data.drainage_condition,
        historical_issues: data.historical_issues,
        expected_yield_target: data.expected_yield_target,
        selling_method: data.selling_method,
        main_crop_income: data.main_crop_income,
        planting_season: data.planting_season,
      });
    }
    setLoading(false);
  }, [user]);

  const refreshVersion = useDataRefresh("profiles");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchProfile();
  }, [user, fetchProfile, refreshVersion]);

  // Also listen for legacy profile-updated events
  useEffect(() => {
    const handler = () => {
      fetchProfile();
      setVersion(v => v + 1);
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [fetchProfile]);

  // Parse crops from comma-separated strings
  const activeCrops = [
    ...(profile.current_crops ? profile.current_crops.split(",").map(c => c.trim()).filter(Boolean) : []),
  ];
  
  // If no current crops, use primary crop
  if (activeCrops.length === 0 && profile.primary_crop) {
    activeCrops.push(profile.primary_crop);
  }

  const allCrops = [
    ...new Set([
      ...activeCrops,
      ...(profile.preferred_crops ? profile.preferred_crops.split(",").map(c => c.trim()).filter(Boolean) : []),
      ...(profile.secondary_crops ? profile.secondary_crops.split(",").map(c => c.trim()).filter(Boolean) : []),
    ]),
  ];

  return { profile, loading, activeCrops, allCrops, refetch: fetchProfile, version };
}
