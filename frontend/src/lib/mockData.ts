// Shared mock data for transcript simulations

export interface TranscriptItem {
  text: string;
  speaker: 'candidate' | 'interviewer';
}

export interface FlagItem {
  type: 'warning' | 'info' | 'error';
  message: string;
  relatedIndex: number;
}

export interface FollowUpItem {
  prompt: string;
  relatedIndex: number;
}

export const mockTranscripts: TranscriptItem[] = [
  { text: "I worked at Apple for 3 years as a senior engineer.", speaker: "candidate" },
  { text: "That's interesting. What team were you on?", speaker: "interviewer" },
  { text: "I was on the iOS team, working on Core ML.", speaker: "candidate" },
  { text: "Can you tell me about a specific project?", speaker: "interviewer" },
  { text: "I led the development of the neural engine optimization framework.", speaker: "candidate" },
];

export const mockFlags: FlagItem[] = [
  { type: "warning", message: "⚠️ CV shows only 6 months at Apple, not 3 years", relatedIndex: 0 },
  { type: "warning", message: "⚠️ No LinkedIn record of Apple employment", relatedIndex: 0 },
  { type: "info", message: "ℹ️ GitHub shows no ML-related repositories", relatedIndex: 4 },
];

export const mockFollowUps: FollowUpItem[] = [
  { prompt: "Ask them who their manager was at Apple", relatedIndex: 0 },
  { prompt: "Verify the specific dates of employment", relatedIndex: 0 },
  { prompt: "Request details about the neural engine project", relatedIndex: 4 },
];