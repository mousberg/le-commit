import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

interface CredibilityScoreProps {
  score: number;
  className?: string;
}

export function CredibilityScore({ score, className }: CredibilityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <ShieldCheck className="h-4 w-4 text-green-700" />;
    if (score >= 60) return <Shield className="h-4 w-4 text-yellow-700" />;
    return <ShieldAlert className="h-4 w-4 text-red-700" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 60) return "Medium";
    return "Low";
  };

  return (
    <Card className={cn("p-4 transition-all duration-500 bg-white border border-gray-200 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {getScoreIcon(score)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Credibility Score</span>
            <div
              className={cn(
                "font-mono text-xs px-2 py-1 rounded transition-all duration-500",
                getScoreColor(score)
              )}
            >
              {score}%
            </div>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                score >= 80 ? "bg-green-500" : 
                score >= 60 ? "bg-yellow-500" : 
                "bg-red-500"
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {getScoreLabel(score)} Credibility
          </p>
        </div>
      </div>
    </Card>
  );
}