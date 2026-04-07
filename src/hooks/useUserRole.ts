import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "farmer" | "seed_seller" | "consumer";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const fetchRole = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    
    try {
      // Fetch role using the security definer function
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: user.id });
      if (!error && data) {
        setRole(data as AppRole);
      }

      // Check verification status
      const { data: verif } = await supabase
        .from("verification_requests")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setIsVerified(verif?.status === "verified");
    } catch (err) {
      console.error("Role fetch error:", err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const canSell = role === "farmer" || role === "seed_seller";
  const canAccessFarmerDashboard = role === "farmer";
  const canVerify = role === "farmer" || role === "seed_seller";

  return { role, loading, isVerified, canSell, canAccessFarmerDashboard, canVerify, refetch: fetchRole };
}
