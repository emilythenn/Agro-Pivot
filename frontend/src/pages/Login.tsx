import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", state: "", district: "", role: "farmer",
  });

  useEffect(() => {
    if (user && !justSignedUp) {
      navigate("/", { replace: true });
    }
  }, [user, justSignedUp, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isSignup) {
        setJustSignedUp(true);
        const { error } = await signUp(form.email, form.password, form.name, form.role);
        if (error) {
          toast({ title: "Signup failed", description: error.message, variant: "destructive" });
          setJustSignedUp(false);
        } else {
          toast({
            title: "Account created!",
            description: "Please log in with your new account.",
          });
          setIsSignup(false);
          setJustSignedUp(false);
          setForm({ ...form, password: "" });
        }
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl"
      >
        <div className="grid gap-6 md:grid-cols-[1.05fr_1fr]">
          <GlassCard className="hidden md:flex p-8 flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden">
                  <img src={logoImg} alt="Agro-Pivot" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Agro-Pivot</h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Agricultural Intelligence
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Smart farming starts with clear insights</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Access weather, market trends, crop guidance, and planning tools from a single dashboard.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/80">
              Secured by AES-256 encryption • Role-based access control
            </p>
          </GlassCard>

          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6 md:hidden">
              <div className="w-11 h-11 rounded-xl overflow-hidden">
                <img src={logoImg} alt="Agro-Pivot" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Agro-Pivot</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Agricultural Intelligence</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 p-1 mb-6">
              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  !isSignup
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsSignup(true)}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  isSignup
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold">{isSignup ? "Create your account" : "Welcome back"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignup
                  ? "Complete the fields below to register your account."
                  : "Sign in to continue to your dashboard."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="Ahmad bin Ismail"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                  placeholder="ahmad@farm.my"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 pr-10 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {isSignup && (
                <>
                  <div className="pt-2 border-t border-border/50">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    >
                      <option value="farmer">Farmer</option>
                      <option value="agronomist">Agronomist / Advisor</option>
                      <option value="admin">Administrator</option>
                      <option value="policy_analyst">Government / Policy Analyst</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">State</label>
                      <select
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                      >
                        <option value="">Select State</option>
                        <option value="kedah">Kedah</option>
                        <option value="perlis">Perlis</option>
                        <option value="perak">Perak</option>
                        <option value="penang">Penang</option>
                        <option value="kelantan">Kelantan</option>
                        <option value="terengganu">Terengganu</option>
                        <option value="pahang">Pahang</option>
                        <option value="selangor">Selangor</option>
                        <option value="johor">Johor</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">District</label>
                      <input
                        type="text"
                        value={form.district}
                        onChange={(e) => setForm({ ...form, district: e.target.value })}
                        className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                        placeholder="Kubang Pasu"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium text-sm py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isSignup ? "Create Account" : "Login"}
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center space-y-3">
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignup
                  ? "Already have an account? Login"
                  : "Don't have an account? Register"}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("demo_mode", "true");
                    navigate("/dashboard");
                  }}
                  className="text-xs text-accent-foreground/70 hover:text-primary transition-colors underline"
                >
                  Enter Demo Mode (Mock Data)
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </div>
  );
}
