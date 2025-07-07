import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

interface FlagBubbleProps {
  type: "warning" | "info" | "error";
  message: string;
}

export function FlagBubble({ type, message }: FlagBubbleProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border animate-in slide-in-from-right fade-in duration-300",
        type === "warning"
          ? "bg-red-500/20 border-red-400/30 text-red-200"
          : type === "error"
          ? "bg-red-600/20 border-red-500/30 text-red-100"
          : "bg-blue-500/20 border-blue-400/30 text-blue-200"
      )}
    >
      {type === "warning" || type === "error" ? (
        <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${type === "error" ? "text-red-500" : "text-red-400"}`} />
      ) : (
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-400" />
      )}
      <p className="text-sm leading-relaxed">{message}</p>
    </div>
  );
}