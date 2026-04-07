import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glowColor?: "primary" | "destructive" | "warning" | "accent";
}

export function GlassCard({ children, className, hoverable = false, glowColor }: GlassCardProps) {
  const glowClasses = {
    primary: "shadow-glow-primary",
    destructive: "shadow-glow-destructive",
    warning: "shadow-glow-warning",
    accent: "shadow-glow-accent",
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl border border-border bg-card shadow-evidence",
        hoverable && "transition-all hover:border-primary/30 hover:shadow-glow-primary cursor-pointer",
        glowColor && glowClasses[glowColor],
        className
      )}
      whileTap={hoverable ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  );
}
