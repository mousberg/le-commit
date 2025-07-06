import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuggestedFollowUpProps {
  prompt: string;
  onCopy?: () => void;
}

export function SuggestedFollowUp({ prompt, onCopy }: SuggestedFollowUpProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    onCopy?.();
  };

  return (
    <div className="group relative p-3 rounded-lg bg-green-500/20 border border-green-400/30 hover:bg-green-500/30 transition-colors animate-in slide-in-from-right fade-in duration-300">
      <div className="flex items-start gap-3">
        <MessageCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed flex-1 text-green-200">{prompt}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-green-400 hover:text-green-300"
        onClick={handleCopy}
      >
        Copy
      </Button>
    </div>
  );
}