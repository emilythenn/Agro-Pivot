import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    role?: string,
    state?: string,
    district?: string,
    consentAccepted?: boolean,
  ) => Promise<{ error: any; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getEmailRedirectUrl(): string | undefined {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL;
  const hasWindowOrigin = typeof window !== "undefined" && Boolean(window.location?.origin);

  if (configured && configured.trim().length > 0) {
    try {
      const parsed = new URL(configured);
      // Guard against stale local config that causes confirm-email to open unreachable localhost links.
      if (hasWindowOrigin) {
        const current = new URL(window.location.origin);
        const configuredIsLocal = isLocalhostHost(parsed.hostname);
        const currentIsLocal = isLocalhostHost(current.hostname);
        if (configuredIsLocal && !currentIsLocal) {
          return `${window.location.origin}/auth/confirm`;
        }
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        if (hasWindowOrigin) {
          return `${window.location.origin}/login`;
        }
        return undefined;
      }

      return parsed.toString();
    } catch {
      if (hasWindowOrigin) {
        return `${window.location.origin}/auth/confirm`;
      }
      return undefined;
    }
  }

  if (hasWindowOrigin) {
    return `${window.location.origin}/auth/confirm`;
  }

  return undefined;
}

function isEmailNotConfirmedError(error: any): boolean {
  const message = (error?.message || "").toLowerCase();
  return message.includes("email not confirmed");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const normalizeAuthError = (error: any) => {
    if (!error) return null;

    const message = (error.message || "").toLowerCase();
    const status = error.status;

    if (status === 429 || message.includes("rate limit") || message.includes("too many")) {
      return {
        ...error,
        message: "Too many attempts. Please wait a minute and try again.",
      };
    }

    if (message.includes("email not confirmed")) {
      return {
        ...error,
        message: "Email not confirmed. Please verify your email before logging in.",
      };
    }

    if (message.includes("invalid login credentials")) {
      return {
        ...error,
        message: "Invalid email or password.",
      };
    }

    if (message.includes("user already registered")) {
      return {
        ...error,
        message: "This email is already registered. Please login instead.",
      };
    }

    if (message.includes("redirect url") || message.includes("redirect_to")) {
      return {
        ...error,
        message: "Auth redirect URL is not allowed. Contact admin to whitelist this app URL in Supabase Auth settings.",
      };
    }

    return error;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    role?: string,
    state?: string,
    district?: string,
    consentAccepted?: boolean,
  ) => {
    const emailRedirectTo = getEmailRedirectUrl();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          full_name: fullName || "",
          role: role || "farmer",
          state: state || "Kedah",
          district: district || "Kota Setar",
          consent_accepted: Boolean(consentAccepted),
        },
      },
    });

    if (!error) {
      // Best-effort informational email; signup succeeds even if this fails.
      await supabase.functions.invoke("signup-notice", {
        body: {
          email,
          fullName: fullName || "",
          role: role || "farmer",
          state: state || "Kedah",
          district: district || "Kota Setar",
          consentAccepted: Boolean(consentAccepted),
        },
      }).catch(() => undefined);
    }

    const needsEmailConfirmation = !data.session;
    return { error: normalizeAuthError(error), needsEmailConfirmation };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (isEmailNotConfirmedError(error)) {
      // Send a fresh confirmation email with a known-good redirect URL.
      await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          ...(getEmailRedirectUrl() ? { emailRedirectTo: getEmailRedirectUrl() } : {}),
        },
      }).catch(() => undefined);

      return {
        error: {
          ...(error || {}),
          message: "Email not confirmed. We sent you a new confirmation email. Please open it and verify your account.",
        },
      };
    }

    return { error: normalizeAuthError(error) };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
