import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant: "green" | "red" | "warning" | "accent";
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ children, variant, pulse, className }: StatusBadgeProps) {
  const variantClasses = {
    green: "bg-primary/10 text-primary border-primary/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    accent: "bg-accent/10 text-accent border-accent/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
        variantClasses[variant],
        pulse && "animate-pulse-glow",
        className
      )}
    >
      {children}
    </span>
  );
}
