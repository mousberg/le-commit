// User Profile Integration Service
// This simulates fetching user configuration from the parent Glass application

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  aiConfig: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    analysisPrompt: string;
    provider: 'openai' | 'groq' | 'anthropic';
  };
  connectedSources: {
    github?: string;
    linkedin?: string;
    cv?: string;
  };
  preferences: {
    sensitivity: 'conservative' | 'balanced' | 'aggressive';
    updateFrequency: number; // seconds
    detectionFocus: string[];
  };
}

// Simulated user profile data
const mockUserProfile: UserProfile = {
  id: 'usr_abc123xyz',
  name: 'John Interviewer',
  email: 'john@company.com',
  aiConfig: {
    apiKey: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    model: 'llama-3.1-70b-versatile',
    provider: 'groq',
    systemPrompt: `You are an expert interview analyst. Analyze candidate responses for:

1. Consistency with their resume/CV
2. Technical accuracy of claims  
3. Behavioral red flags
4. Potential exaggerations or lies

Provide real-time flags and suggested follow-up questions to help interviewers catch inconsistencies.`,
    analysisPrompt: `Analyze this interview transcript segment for potential inconsistencies:

- Check if technical claims match the candidate's stated experience level
- Flag any contradictions with previously stated information  
- Identify vague or evasive responses
- Suggest specific follow-up questions to verify claims

Be concise and actionable in your analysis.`
  },
  connectedSources: {
    github: 'Automatically synced via OAuth',
    linkedin: 'Connected to company LinkedIn',
    cv: 'PDF parsing enabled'
  },
  preferences: {
    sensitivity: 'balanced',
    updateFrequency: 10,
    detectionFocus: ['technical-claims', 'experience-verification', 'behavioral-flags']
  }
};

// Simulate the GET request to parent application
export async function fetchUserProfile(): Promise<UserProfile> {
  // In a real Glass fork, this would be:
  // const response = await fetch('/api/user/profile');
  // return response.json();
  
  // For demo purposes, simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return mockUserProfile;
}

// Update user profile (sync back to parent app)
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
  // In a real Glass fork, this would be:
  // await fetch('/api/user/profile', {
  //   method: 'PATCH',
  //   body: JSON.stringify(updates)
  // });
  
  console.log('Syncing profile updates to parent app:', updates);
  await new Promise(resolve => setTimeout(resolve, 200));
}

// Check if running inside Glass (Electron) context
export function isRunningInGlass(): boolean {
  // In a real implementation, check for electron context
  // return typeof window !== 'undefined' && window.electron;
  
  // For demo, always return true
  return true;
}

// Glass IPC communication for deep integration
export function sendToGlass(channel: string, data: unknown): void {
  // In a real Glass fork:
  // if (window.electron) {
  //   window.electron.ipcRenderer.send(channel, data);
  // }
  
  console.log(`Glass IPC [${channel}]:`, data);
}