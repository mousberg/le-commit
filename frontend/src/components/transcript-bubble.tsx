import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TranscriptBubbleProps {
  text: string;
  speaker: "candidate" | "interviewer";
  timestamp: Date;
  isNew?: boolean;
}

export function TranscriptBubble({ text, speaker, timestamp, isNew }: TranscriptBubbleProps) {
  return (
    <div
      className={cn(
        "flex",
        speaker === "interviewer" ? "justify-start" : "justify-end",
        isNew && "animate-in slide-in-from-bottom-2 fade-in duration-300"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2",
          speaker === "interviewer"
            ? "bg-white/10 text-white/90 border border-white/20"
            : "bg-white/20 text-white border border-white/30"
        )}
      >
        <p className="text-sm leading-relaxed">{text}</p>
        <p className="text-xs text-white/50 mt-1">
          {format(timestamp, "HH:mm:ss")}
        </p>
      </div>
    </div>
  );
}