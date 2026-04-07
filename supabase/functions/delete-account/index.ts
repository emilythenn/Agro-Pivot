import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing config");

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get the user from the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) throw new Error("Invalid session");

    const { email, password } = await req.json();

    // Verify the email matches
    if (email !== user.email) {
      return new Response(JSON.stringify({ error: "Email does not match your account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify password by attempting sign in
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return new Response(JSON.stringify({ error: "Incorrect password" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Delete all user data from tables
    await Promise.all([
      supabaseAdmin.from("alerts").delete().eq("user_id", userId),
      supabaseAdmin.from("activity_log").delete().eq("user_id", userId),
      supabaseAdmin.from("active_crops").delete().eq("user_id", userId),
      supabaseAdmin.from("evidence_reports").delete().eq("user_id", userId),
      supabaseAdmin.from("scan_results").delete().eq("user_id", userId),
      supabaseAdmin.from("user_settings").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("id", userId),
    ]);

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Delete account error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
