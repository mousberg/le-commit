import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FloatingPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FloatingPanel({ title, children, className }: FloatingPanelProps) {
  return (
    <div className={cn("glass-panel p-4", className)}>
      <h3 className="text-sm font-medium text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}