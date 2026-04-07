import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PASSWORD_RULES, validatePassword } from "@/lib/passwordValidation";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Wait for Supabase to process the recovery token from URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { valid, errors } = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast({ title: "Password too weak", description: errors[0], variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      await supabase.auth.signOut();
    }
  };

  const inputClass = "w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors";

  // === Waiting for session ===
  if (!sessionReady && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verifying recovery link...</p>
        </div>
      </div>
    );
  }

  // === SUCCESS ===
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Password Updated! ✅</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Your password has been reset. Please log in with your new password.</p>
          <button onClick={() => navigate("/")}
            className="bg-primary text-primary-foreground font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // === NEW PASSWORD FORM ===
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Set New Password</h1>
              <p className="text-xs text-muted-foreground">Enter your new password</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">New Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {PASSWORD_RULES.map(rule => (
                    <div key={rule.key} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] ${
                        rule.test(password) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>{rule.test(password) ? "✓" : ""}</div>
                      <span className={`text-[11px] ${rule.test(password) ? "text-foreground" : "text-muted-foreground"}`}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} required value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClass} pr-10 ${confirmPassword.length > 0
                    ? passwordsMatch ? "border-primary/50" : "border-destructive/50" : ""}`}
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit" disabled={loading || !valid || !passwordsMatch}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium text-sm py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
