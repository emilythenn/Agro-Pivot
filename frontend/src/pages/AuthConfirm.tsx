import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your email...");

  const authError = useMemo(() => {
    if (typeof window === "undefined") return "";

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    return (
      searchParams.get("error_description") ||
      searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error") ||
      ""
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      if (authError) {
        setMessage(`Email confirmation failed: ${authError}`);
        setTimeout(() => {
          if (!cancelled) navigate("/login", { replace: true });
        }, 2500);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (cancelled) return;

      if (data.session) {
        setMessage("Email confirmed. Redirecting to dashboard...");
        setTimeout(() => {
          if (!cancelled) navigate("/dashboard", { replace: true });
        }, 1000);
        return;
      }

      setMessage("Email confirmed. Redirecting to login...");
      setTimeout(() => {
        if (!cancelled) navigate("/login", { replace: true });
      }, 1200);
    };

    finalize().catch(() => {
      setMessage("Could not complete confirmation. Redirecting to login...");
      setTimeout(() => {
        if (!cancelled) navigate("/login", { replace: true });
      }, 2000);
    });

    return () => {
      cancelled = true;
    };
  }, [authError, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card/60 p-6 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <h1 className="text-lg font-semibold mb-1">Email Confirmation</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
