import { CvData, Experience, Language, ContractType } from './interfaces/cv';

// LinkedIn API Response interfaces
interface LinkedInApiExperience {
  company: string;
  title: string;
  location?: string;
  start_date: string;
  end_date: string;
  description_html?: string;
}

interface LinkedInApiLanguage {
  title: string;
  subtitle?: string;
}

interface LinkedInApiResponse {
  first_name?: string;
  last_name?: string;
  name?: string;
  city?: string;
  about?: string;
  position?: string;
  url?: string;
  input_url?: string;
  connections?: number;
  followers?: number;
  linkedin_id?: string;
  country_code?: string;
  current_company?: {
    title?: string;
    name?: string;
  };
  avatar?: string;
  banner_image?: string;
  experience?: LinkedInApiExperience[];
  languages?: LinkedInApiLanguage[];
}

/**
 * Helper function to parse year from LinkedIn date string
 */
function parseLinkedInYear(dateStr: string): number | undefined {
  if (!dateStr || dateStr === 'Present') return undefined;
  
  // Try to extract year from various formats
  const yearMatch = dateStr.match(/(\d{4})/);
  return yearMatch ? parseInt(yearMatch[1]) : undefined;
}

/**
 * Helper function to parse month from LinkedIn date string
 */
function parseLinkedInMonth(dateStr: string): number | undefined {
  if (!dateStr || dateStr === 'Present') return undefined;
  
  const monthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  
  const monthMatch = dateStr.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
  if (monthMatch) {
    return monthNames.indexOf(monthMatch[1]) + 1;
  }
  
  return undefined;
}

/**
 * Convert LinkedIn API response to ProfileData format
 * @param linkedinApiData - LinkedIn API response data
 * @returns ProfileData compatible with our system
 */
export function convertLinkedInApiToProfileData(linkedinApiData: LinkedInApiResponse | LinkedInApiResponse[]): CvData {
  const data = Array.isArray(linkedinApiData) ? linkedinApiData[0] : linkedinApiData;
  
  // Extract name parts
  const firstName = data.first_name || '';
  const lastName = data.last_name || '';
  const fullName = data.name || '';
  
  // If we don't have first/last name but have full name, try to split
  let finalFirstName = firstName;
  let finalLastName = lastName;
  
  if (!firstName && !lastName && fullName) {
    const nameParts = fullName.split(' ');
    finalFirstName = nameParts[0] || '';
    finalLastName = nameParts.slice(1).join(' ') || '';
  }
  
  // Convert experience - simplified for now
  const professionalExperiences: Experience[] = (data.experience || []).map((exp: LinkedInApiExperience) => ({
    companyName: exp.company || '',
    title: exp.title || '',
    location: exp.location || '',
    type: ContractType.PERMANENT_CONTRACT, // Default, could be enhanced
    startYear: parseLinkedInYear(exp.start_date) || 0,
    startMonth: parseLinkedInMonth(exp.start_date),
    endYear: exp.end_date === 'Present' ? undefined : parseLinkedInYear(exp.end_date),
    endMonth: exp.end_date === 'Present' ? undefined : parseLinkedInMonth(exp.end_date),
    ongoing: exp.end_date === 'Present',
    description: exp.description_html || '',
    associatedSkills: []
  }));
  
  // Convert languages - simplified for now
  const languages: Language[] = (data.languages || []).map((lang: LinkedInApiLanguage) => ({
    language: lang.title || '',
    level: 'PROFESSIONAL' // Default level
  }));
  
  // Extract skills from various sources
  const skills: string[] = [];
  if (data.position) skills.push(data.position);
  
  const profileData: CvData = {
    firstName: finalFirstName,
    lastName: finalLastName,
    address: data.city || '',
    email: '', // LinkedIn API doesn't typically provide email
    phone: '',
    linkedin: data.url || data.input_url || '',
    github: '',
    personalWebsite: '',
    professionalSummary: data.about || '',
    jobTitle: data.position || data.current_company?.title || '',
    professionalExperiences,
    otherExperiences: [],
    educations: [], // Could be enhanced if education data is available
    skills,
    languages,
    publications: [],
    distinctions: [],
    hobbies: [],
    references: [],
    certifications: [],
    other: {
      connections: data.connections,
      followers: data.followers,
      linkedinId: data.linkedin_id,
      countryCode: data.country_code,
      currentCompany: data.current_company,
      avatar: data.avatar,
      bannerImage: data.banner_image
    },
    source: 'linkedin'
  };
  
  return profileData;
}

/**
 * Poll for LinkedIn API results with progress callbacks
 * @param snapshotId - Snapshot ID from initial API call
 * @param apiKey - API key for authentication
 * @param onProgress - Optional progress callback
 * @returns LinkedIn API results
 */
async function pollForLinkedInResults(
  snapshotId: string, 
  apiKey: string,
  onProgress?: (progress: { attempt: number; maxAttempts: number; status: string; message: string }) => void
): Promise<unknown[]> {
  const maxAttempts = 30; // 5 minutes with 10-second intervals
  const pollInterval = 10000; // 10 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      onProgress?.({
        attempt: attempt + 1,
        maxAttempts,
        status: 'polling',
        message: `Checking LinkedIn data... (${attempt + 1}/${maxAttempts})`
      });

      const response = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check if the snapshot is ready
      if (data.status === 'ready' && data.data && data.data.length > 0) {
        onProgress?.({
          attempt: attempt + 1,
          maxAttempts,
          status: 'ready',
          message: 'LinkedIn data retrieved successfully!'
        });
        return data.data;
      }
      
      // If not ready, wait and try again
      if (data.status === 'running') {
        onProgress?.({
          attempt: attempt + 1,
          maxAttempts,
          status: 'running',
          message: `LinkedIn processing in progress... (${Math.round(((attempt + 1) / maxAttempts) * 100)}%)`
        });
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }
      
      // If failed or other status
      if (data.status === 'failed') {
        throw new Error(`LinkedIn API processing failed: ${data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      onProgress?.({
        attempt: attempt + 1,
        maxAttempts,
        status: 'retrying',
        message: `Retrying LinkedIn request... (${attempt + 1}/${maxAttempts})`
      });
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  throw new Error('LinkedIn API polling timed out');
}

export type LinkedInProgress = {
  attempt: number;
  maxAttempts: number;
  status: 'starting' | 'polling' | 'running' | 'ready' | 'retrying' | 'error';
  message: string;
  percentage?: number;
};

/**
 * Process LinkedIn URL using BrightData API with progress tracking
 * @param linkedinUrl - LinkedIn profile URL
 * @param onProgress - Optional progress callback
 * @returns ProfileData from LinkedIn API
 */
export async function processLinkedInUrl(
  linkedinUrl: string,
  onProgress?: (progress: LinkedInProgress) => void
): Promise<CvData> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('BRIGHTDATA_API_KEY environment variable is not set');
  }
  
  try {
    onProgress?.({
      attempt: 1,
      maxAttempts: 30,
      status: 'starting',
      message: 'Initiating LinkedIn data extraction...',
      percentage: 5
    });

    const response = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjuj0&format=json&uncompressed_webhook=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ url: linkedinUrl }]),
    });
    
    if (!response.ok) {
      throw new Error(`LinkedIn API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The API returns a snapshot_id, we need to poll for results
    const snapshotId = data.snapshot_id;
    
    if (!snapshotId) {
      throw new Error('No snapshot_id returned from LinkedIn API');
    }

    onProgress?.({
      attempt: 1,
      maxAttempts: 30,
      status: 'polling',
      message: 'LinkedIn processing started, waiting for results...',
      percentage: 10
    });
    
    // Poll for results with progress updates
    const results = await pollForLinkedInResults(snapshotId, apiKey, (pollProgress) => {
      onProgress?.({
        ...pollProgress,
        percentage: 10 + (pollProgress.attempt / pollProgress.maxAttempts) * 80 // 10% to 90%
      });
    });
    
    if (!results || results.length === 0) {
      throw new Error('No LinkedIn data returned from API');
    }

    onProgress?.({
      attempt: 30,
      maxAttempts: 30,
      status: 'ready',
      message: 'Converting LinkedIn data...',
      percentage: 95
    });
    
    // Convert the first result to our ProfileData format
    const profileData = convertLinkedInApiToProfileData(results[0]);

    onProgress?.({
      attempt: 30,
      maxAttempts: 30,
      status: 'ready',
      message: 'LinkedIn analysis complete!',
      percentage: 100
    });

    return profileData;
    
  } catch (error) {
    onProgress?.({
      attempt: 0,
      maxAttempts: 30,
      status: 'error',
      message: `LinkedIn processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      percentage: 0
    });
    console.error('Error processing LinkedIn URL:', error);
    throw new Error(`Failed to process LinkedIn URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}