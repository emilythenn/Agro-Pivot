import { supabase } from "@/integrations/supabase/client";

/**
 * Triggers the notification engine to analyze conditions and generate alerts.
 * Called on dashboard load and periodically.
 */
export async function triggerNotificationEngine(userId: string): Promise<{
  total_generated: number;
  new_alerts: number;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notification-engine`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ user_id: userId }),
    }
  );

  if (!resp.ok) {
    console.error("Notification engine error:", await resp.text());
    return { total_generated: 0, new_alerts: 0 };
  }

  return resp.json();
}

/**
 * Get the severity color scheme for a given priority level
 */
export function getSeverityColors(severity: string) {
  switch (severity) {
    case "high":
      return {
        border: "border-l-destructive",
        bg: "bg-destructive/10",
        text: "text-destructive",
        badge: "red" as const,
        dot: "bg-destructive",
        label: "🔴 High",
      };
    case "medium":
      return {
        border: "border-l-warning",
        bg: "bg-warning/10",
        text: "text-warning",
        badge: "warning" as const,
        dot: "bg-warning",
        label: "🟡 Medium",
      };
    case "low":
    default:
      return {
        border: "border-l-primary",
        bg: "bg-primary/10",
        text: "text-primary",
        badge: "green" as const,
        dot: "bg-primary",
        label: "🟢 Low",
      };
  }
}

/**
 * Alert type icon mapping
 */
export function getAlertTypeIcon(alertType: string): string {
  const icons: Record<string, string> = {
    Weather: "🌧️",
    Market: "📈",
    "Crop Health": "🔬",
    "Crop Advisory": "🌾",
    Evidence: "📄",
    "Smart Alert": "🔥",
    Reminder: "📋",
    Scan: "📸",
  };
  return icons[alertType] || "🔔";
}
