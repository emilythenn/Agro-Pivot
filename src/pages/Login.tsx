import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Eye, EyeOff, ArrowRight, Loader2, ArrowLeft, Mail, Wheat, Sprout, ShoppingCart } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PASSWORD_RULES, validatePassword } from "@/lib/passwordValidation";

type PageMode = "login" | "signup" | "check_email" | "forgot" | "forgot_sent";
type UserRole = "farmer" | "seed_seller" | "consumer";

const ROLE_OPTIONS: { value: UserRole; label: string; icon: any; description: string }[] = [
  { value: "farmer", label: "Farmer", icon: Wheat, description: "Grow & sell crops, buy seeds, full farm tools" },
  { value: "seed_seller", label: "Seed Seller", icon: Sprout, description: "Sell seeds on the marketplace" },
  { value: "consumer", label: "Consumer", icon: ShoppingCart, description: "Buy crops & seeds from sellers" },
];

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<PageMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("farmer");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (user && mode !== "check_email") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, mode, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMode("forgot_sent");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { valid, errors } = validatePassword(form.password);
    if (!valid) {
      toast({ title: "Password too weak", description: errors[0], variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.name, selectedRole);
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      setMode("check_email");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const inputClass = "w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors";

  const renderContent = () => {
    if (mode === "check_email") {
      return (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Check Your Email</h2>
          <p className="text-xs text-muted-foreground mb-2">
            We've sent a verification link to <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Click the link in the email to verify your account, then come back here to log in.
          </p>
          <button onClick={() => setMode("login")}
            className="bg-primary text-primary-foreground font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
            Back to Login
          </button>
        </GlassCard>
      );
    }

    if (mode === "forgot") {
      return (
        <GlassCard className="p-8">
          <button onClick={() => setMode("login")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </button>
          <h2 className="text-lg font-semibold mb-1">Forgot Password</h2>
          <p className="text-xs text-muted-foreground mb-6">Enter your email to receive a password reset link</p>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass} placeholder="ahmad@farm.my" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium text-sm py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        </GlassCard>
      );
    }

    if (mode === "forgot_sent") {
      return (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Check Your Email</h2>
          <p className="text-xs text-muted-foreground mb-2">
            We've sent a password reset link to <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <p className="text-xs text-muted-foreground mb-6">Click the link in the email to set a new password.</p>
          <button onClick={() => setMode("login")}
            className="bg-primary text-primary-foreground font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
            Back to Login
          </button>
        </GlassCard>
      );
    }

    const isSignup = mode === "signup";
    return (
      <GlassCard className="p-8">
        <h2 className="text-lg font-semibold mb-1">{isSignup ? "Create Account" : "Login"}</h2>
        <p className="text-xs text-muted-foreground mb-6">
          {isSignup ? "Register to access the agricultural intelligence platform" : "Login to access your dashboard"}
        </p>

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
          {isSignup && (
            <>
              {/* Role Selection */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block font-medium">I am a...</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const selected = selectedRole === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setSelectedRole(opt.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-secondary/20 text-muted-foreground hover:border-primary/30"
                        }`}>
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  {ROLE_OPTIONS.find(r => r.value === selectedRole)?.description}
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass} placeholder="Ahmad bin Ismail" />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass} placeholder="ahmad@farm.my" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`${inputClass} pr-10`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
            {isSignup && form.password.length > 0 && (
              <div className="mt-2 space-y-1">
                {PASSWORD_RULES.map(rule => (
                  <div key={rule.key} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] ${
                      rule.test(form.password) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>{rule.test(form.password) ? "✓" : ""}</div>
                    <span className={`text-[11px] ${rule.test(form.password) ? "text-foreground" : "text-muted-foreground"}`}>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium text-sm py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>{isSignup ? "Create Account" : "Login"}<ArrowRight className="h-4 w-4" strokeWidth={1.5} /></>
            )}
          </button>
        </form>

        {!isSignup && (
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setMode("forgot")}
              className="text-xs text-primary hover:text-primary/80 transition-colors">
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-4 text-center space-y-3">
          <button onClick={() => setMode(isSignup ? "login" : "signup")}
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            {isSignup ? "Already have an account? Login" : "Don't have an account? Register"}
          </button>
          <div>
            <button type="button" onClick={() => { localStorage.setItem("demo_mode", "true"); navigate("/dashboard"); }}
              className="text-xs text-accent-foreground/70 hover:text-primary transition-colors underline">
              Enter Demo Mode (Mock Data)
            </button>
          </div>
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl overflow-hidden">
            <img src={logoImg} alt="Agro-Pivot" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Agro-Pivot</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Agricultural Intelligence</p>
          </div>
        </div>
        {renderContent()}
        <p className="text-[10px] text-muted-foreground/50 text-center mt-6">Secured by AES-256 encryption</p>
      </motion.div>
    </div>
  );
}
