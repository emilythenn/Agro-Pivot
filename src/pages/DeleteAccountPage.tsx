import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, ShieldAlert, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function DeleteAccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const email = user?.email || searchParams.get("email") || "";

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleDelete = async () => {
    if (!password) {
      toast({ title: "Password required", description: "Please enter your password to confirm.", variant: "destructive" });
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const result = await resp.json();

      if (!resp.ok) {
        toast({ title: "Deletion failed", description: result.error || "Please try again.", variant: "destructive" });
        setDeleting(false);
        return;
      }

      setDeleted(true);
      await signOut();
      setTimeout(() => navigate("/", { replace: true }), 3000);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassCard className="p-8 max-w-md text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Account Deleted</h2>
            <p className="text-sm text-muted-foreground">
              Your account and all associated data have been permanently deleted. You will be redirected shortly.
            </p>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <GlassCard className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Delete Your Account</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This action is <span className="font-semibold text-destructive">permanent and irreversible</span>. 
              All your data including crops, scans, reports, and settings will be permanently deleted.
            </p>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-xs text-destructive space-y-1">
                <p className="font-semibold">The following will be permanently deleted:</p>
                <ul className="list-disc ml-4 space-y-0.5 text-destructive/80">
                  <li>Your profile and farm data</li>
                  <li>All active crops and planting records</li>
                  <li>Scan results and evidence reports</li>
                  <li>Alerts, settings, and activity history</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-secondary/20 text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Enter your password to confirm
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/dashboard/settings")}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={handleDelete}
              disabled={deleting || !password}
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Confirm Deletion</>
              )}
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
