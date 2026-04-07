import { supabase } from "@/integrations/supabase/client";

interface LogParams {
  userId: string;
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(params: LogParams) {
  const { error } = await supabase.from("activity_log").insert({
    user_id: params.userId,
    activity_type: params.activityType,
    title: params.title,
    description: params.description || null,
    metadata: params.metadata || null,
  });
  if (error) console.error("Failed to log activity:", error);
}

export async function getRecentActivities(userId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
