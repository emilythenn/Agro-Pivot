import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function EmailVerified() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const handleVerification = async () => {
      // Supabase automatically processes the token from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setStatus("error");
        return;
      }

      if (session) {
        // Sign out so user manually logs in after verification
        await supabase.auth.signOut();
        setStatus("success");
      } else {
        // Sometimes the hash params are processed by onAuthStateChange
        // Give it a moment
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            await supabase.auth.signOut();
          }
          setStatus("success");
        }, 2000);
      }
    };

    handleVerification();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        {status === "verifying" && (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Verifying your email...</h1>
            <p className="text-sm text-muted-foreground mt-2">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Email Verified! ✅</h1>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-primary text-primary-foreground font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Proceed to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Verification Failed</h1>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              The verification link may have expired. Please try signing up again.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-primary text-primary-foreground font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
