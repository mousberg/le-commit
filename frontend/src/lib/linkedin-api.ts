import { CvData, Experience, Language, ContractType, LanguageLevel } from './interfaces/cv';
import { LinkedInData, LinkedInExperience, LinkedInEducation, LinkedInActivity } from './interfaces/applicant';

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
    level: LanguageLevel.PROFESSIONAL // Default level
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
    }
  };
  
  return profileData;
}

/**
 * Convert LinkedIn API response to LinkedIn-specific data format
 * @param linkedinApiData - Response from LinkedIn API
 * @returns LinkedInData with LinkedIn-specific fields
 */
export function convertLinkedInApiToLinkedInData(linkedinApiData: LinkedInApiResponse | LinkedInApiResponse[]): LinkedInData {
  const data = Array.isArray(linkedinApiData) ? linkedinApiData[0] : linkedinApiData;
  
  // Extract name parts
  const firstName = data.first_name || '';
  const lastName = data.last_name || '';
  const fullName = data.name || `${firstName} ${lastName}`.trim();
  
  // Convert experience to LinkedIn format
  const experience: LinkedInExperience[] = (data.experience || []).map((exp: LinkedInApiExperience) => ({
    company: exp.company || '',
    title: exp.title || '',
    duration: `${exp.start_date || ''} - ${exp.end_date || ''}`,
    location: exp.location || '',
    description: exp.description_html || '',
    companyExists: true // We could enhance this with company verification
  }));
  
  // Convert education (if available in API response)
  const education: LinkedInEducation[] = []; // Would need education data from API
  
  // LinkedIn activity data
  const activity: LinkedInActivity = {
    posts: 0, // Would need activity data from API
    likes: 0,
    comments: 0,
    shares: 0,
    lastActivityDate: undefined
  };
  
  // Extract skills
  const skills: string[] = [];
  if (data.position) skills.push(data.position);
  
  const linkedinData: LinkedInData = {
    name: fullName,
    headline: data.about || data.position || '',
    location: data.city || '',
    connections: data.connections || 0,
    profileUrl: data.url || data.input_url || '',
    accountCreationDate: undefined, // Not typically available from API
    experience,
    education,
    skills,
    activity,
    recommendations: [], // Would need recommendation data from API
    certifications: [] // Would need certification data from API
  };
  
  return linkedinData;
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
  const maxAttempts = 30; // Reduced from 60 to 30 (2.5 minutes)
  const pollInterval = 5000; // 5 seconds
  let consecutiveEmptySnapshots = 0;
  const maxEmptySnapshots = 3; // Allow 3 consecutive empty snapshots before giving up
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      onProgress?.({
        attempt: attempt + 1,
        maxAttempts,
        status: 'polling',
        message: `Checking LinkedIn data... (${attempt + 1}/${maxAttempts})`
      });

      const response = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
      }
      
      const statusData = await response.json();
      const status = statusData.status || statusData.state || statusData.job_status;
      const isRunning = status === 'running' || status === 'processing' || status === 'building' || status === 'in_progress';
      
      // If not running (including undefined), try to download
      if (!isRunning) {
        onProgress?.({
          attempt: attempt + 1,
          maxAttempts,
          status: 'ready',
          message: 'LinkedIn job done, downloading data...'
        });
        
        // Wait 1 second then download
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const downloadResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        
        if (downloadResponse.ok) {
          const data = await downloadResponse.json();
          if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            return Array.isArray(data) ? data : [data];
          } else {
            // Empty data returned - this could be a "Snapshot is empty" case
            console.log(`⚠️ Empty data returned for snapshot ${snapshotId} (attempt ${attempt + 1})`);
            consecutiveEmptySnapshots++;
            if (consecutiveEmptySnapshots >= maxEmptySnapshots) {
              throw new Error(`LinkedIn snapshot consistently empty after ${maxEmptySnapshots} attempts - profile may be private or inaccessible`);
            }
          }
        } else {
          // Check if this is a "Snapshot is empty" error
          const errorText = await downloadResponse.text();
          if (errorText.includes('Snapshot is empty') || errorText.includes('empty')) {
            console.log(`⚠️ Snapshot is empty for ${snapshotId} (attempt ${attempt + 1})`);
            consecutiveEmptySnapshots++;
            if (consecutiveEmptySnapshots >= maxEmptySnapshots) {
              throw new Error('LinkedIn profile not accessible - snapshot consistently empty');
            }
          } else {
            console.error(`LinkedIn download failed: ${downloadResponse.status} ${downloadResponse.statusText} - ${errorText}`);
          }
        }
      }
      
      // Still running or no data yet
      onProgress?.({
        attempt: attempt + 1,
        maxAttempts,
        status: 'running',
        message: `LinkedIn processing... (${Math.round(((attempt + 1) / maxAttempts) * 100)}%)`
      });
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      onProgress?.({
        attempt: attempt + 1,
        maxAttempts,
        status: 'retrying',
        message: `Retrying... (${attempt + 1}/${maxAttempts})`
      });
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
 * Process raw LinkedIn data from BrightData API
 * @param linkedinRawData - Raw data from BrightData API
 * @returns LinkedInData from LinkedIn API
 */
export function processLinkedInData(linkedinRawData: unknown): LinkedInData {
  try {
    // Handle array of results (common case)
    const dataArray = Array.isArray(linkedinRawData) ? linkedinRawData : [linkedinRawData];
    
    if (dataArray.length === 0) {
      throw new Error('No LinkedIn data to process');
    }
    
    // Process the first result
    const result = dataArray[0];
    
    // Convert to LinkedInData (preserving LinkedIn-specific fields)
    return convertLinkedInApiToLinkedInData(result as LinkedInApiResponse);
  } catch (error) {
    console.error('Error processing LinkedIn data:', error);
    throw new Error(`Failed to process LinkedIn data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process LinkedIn URL using BrightData API with progress tracking
 * @param linkedinUrl - LinkedIn profile URL
 * @param onProgress - Optional progress callback
 * @returns ProfileData from LinkedIn API
 */
export async function processLinkedInUrl(
  linkedinUrl: string,
  onProgress?: (progress: LinkedInProgress) => void
): Promise<LinkedInData> {
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
        attempt: pollProgress.attempt,
        maxAttempts: pollProgress.maxAttempts,
        status: pollProgress.status as 'starting' | 'polling' | 'running' | 'ready' | 'retrying' | 'error',
        message: pollProgress.message,
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
    
    // Convert the results to our ProfileData format
    const profileData = processLinkedInData(results);

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

/**
 * Check for existing LinkedIn snapshots for the same URL
 * @param linkedinUrl - LinkedIn profile URL to check
 * @returns Existing job ID if found, null if none
 */
export async function findExistingLinkedInSnapshot(linkedinUrl: string): Promise<string | null> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('BRIGHTDATA_API_KEY environment variable is not set');
  }
  
  try {
    // console.log(`🔍 Checking for existing LinkedIn snapshots for URL: ${linkedinUrl}`);
    
    const response = await fetch(`https://api.brightdata.com/datasets/v3/snapshots?status=ready`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch snapshots: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const snapshots = await response.json();
    console.log(`📊 Found ${snapshots.length || 0} ready snapshots`);
    
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return null;
    }
    
    // Normalize the LinkedIn URL for comparison
    const normalizeUrl = (url: string) => {
      return url
        .toLowerCase()
        .replace(/https?:\/\//, '') // Remove protocol
        .replace(/www\./, '') // Remove www
        .replace(/\/$/, '') // Remove trailing slash
        .replace(/\/+/g, '/'); // Normalize multiple slashes
    };
    
    const targetUrl = normalizeUrl(linkedinUrl);
    
    // Since the snapshots list doesn't include URLs, we need to check each snapshot individually
    const matchingSnapshots = [];
    
    for (const snapshot of snapshots) {
      try {
        // Fetch individual snapshot details to get the input URL
        const detailResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshot.id}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!detailResponse.ok) {
          console.log(`⚠️ Failed to fetch details for snapshot ${snapshot.id}`);
          continue;
        }
        
        const responseText = await detailResponse.text();
        if (!responseText) {
          console.log(`⚠️ Empty response for snapshot ${snapshot.id}`);
          continue;
        }
        
        let snapshotDetails;
        try {
          snapshotDetails = JSON.parse(responseText);
        } catch {
          console.log(`⚠️ Invalid JSON response for snapshot ${snapshot.id}:`, responseText);
          continue;
        }
        const snapshotUrl = snapshotDetails.input?.[0]?.url || '';
        
        if (snapshotUrl && normalizeUrl(snapshotUrl) === targetUrl) {
          matchingSnapshots.push({
            ...snapshot,
            inputUrl: snapshotUrl,
            createdAt: snapshot.created_at || snapshot.createdAt
          });
        }
      } catch (error) {
        console.log(`⚠️ Error checking snapshot ${snapshot.id}:`, error);
        continue;
      }
    }
    
    if (matchingSnapshots.length === 0) {
      console.log(`❌ No existing snapshots found for ${linkedinUrl}`);
      return null;
    }
    
    // Sort by creation date and get the oldest one
    matchingSnapshots.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    const oldestSnapshot = matchingSnapshots[0];
    console.log(`✅ Found existing snapshot for ${linkedinUrl}: ${oldestSnapshot.id}`);
    console.log(`📅 Created: ${oldestSnapshot.created_at || oldestSnapshot.createdAt}`);
    
    return oldestSnapshot.id;
    
  } catch (error) {
    console.error(`Error checking existing snapshots:`, error);
    return null; // Don't fail the whole process, just proceed with new job
  }
}

/**
 * Start a LinkedIn job and return the job ID (checks for existing snapshots first)
 * @param linkedinUrl - LinkedIn profile URL
 * @returns Job ID and any immediate data
 */
export async function startLinkedInJob(linkedinUrl: string): Promise<{ jobId: string; data?: unknown; isExisting?: boolean }> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('BRIGHTDATA_API_KEY environment variable is not set');
  }
  
  // First, check if we already have a snapshot for this URL
  const existingJobId = await findExistingLinkedInSnapshot(linkedinUrl);
  
  if (existingJobId) {
    console.log(`♻️ Reusing existing LinkedIn snapshot: ${existingJobId}`);
    return { jobId: existingJobId, isExisting: true };
  }
  
  console.log(`🚀 Starting new LinkedIn job for URL: ${linkedinUrl}`);
  
  try {
    const response = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjuj0&format=json&uncompressed_webhook=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ url: linkedinUrl }]),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LinkedIn API error:`, errorText);
      throw new Error(`LinkedIn API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    // console.log(`LinkedIn API response:`, data);
    const jobId = data.snapshot_id;
    
    if (!jobId) {
      throw new Error('No snapshot_id returned from LinkedIn API');
    }
    
    console.log(`✅ New LinkedIn job started with ID: ${jobId}`);
    return { jobId, data: data.data || null, isExisting: false };
    
  } catch (error) {
    console.error(`Error starting LinkedIn job:`, error);
    throw error;
  }
}

/**
 * Check LinkedIn job status and download data if ready
 * @param jobId - Job ID from startLinkedInJob
 * @param isExisting - Whether this is an existing snapshot (optional)
 * @returns Job status and data if available
 */
export async function checkLinkedInJob(jobId: string, isExisting?: boolean): Promise<{
  status: 'running' | 'completed' | 'failed';
  data?: unknown;
}> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('BRIGHTDATA_API_KEY environment variable is not set');
  }
  
  try {
    // If it's an existing snapshot, skip progress check and go straight to download
    if (isExisting) {
      console.log(`📋 Existing snapshot ${jobId}, attempting direct download...`);
      
      const downloadResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${jobId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (downloadResponse.ok) {
        const data = await downloadResponse.json();
        console.log(`Downloaded existing data for job ${jobId}:`, Array.isArray(data) ? `Array with ${data.length} items` : typeof data);
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          return { status: 'completed', data };
        } else {
          console.log(`⚠️ Existing snapshot ${jobId} returned empty data - marking as failed`);
          return { status: 'failed' };
        }
      } else {
        const errorText = await downloadResponse.text();
        console.error(`Failed to download existing LinkedIn data: ${downloadResponse.status} ${downloadResponse.statusText} - ${errorText}`);
        if (errorText.includes('Snapshot is empty') || errorText.includes('empty')) {
          console.log(`⚠️ Existing snapshot ${jobId} is empty - marking as failed`);
          return { status: 'failed' };
        }
      }
      
      return { status: 'failed' };
    }
    
    // Check job status for new jobs
    const response = await fetch(`https://api.brightdata.com/datasets/v3/progress/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.status}`);
    }

    const statusData = await response.json();
    const status = statusData.status || statusData.state || statusData.job_status;
    
    // Log only on status changes
    if (status !== 'running') {
      console.log(`LinkedIn job ${jobId} status: ${status}`);
    }
    
    // Map BrightData statuses to our internal ones
    if (status === 'failed' || status === 'error' || status === 'cancelled') {
      return { status: 'failed' };
    }
    
    const isRunning = status === 'running' || status === 'processing' || status === 'building' || status === 'in_progress';
    const isReady = status === 'ready' || status === 'completed' || status === 'complete';

    if (isReady || !isRunning) {
      // Job is done, try to download data
      console.log(`Job ${jobId} is ready (status: ${status}), attempting download...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const downloadResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${jobId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (downloadResponse.ok) {
        const data = await downloadResponse.json();
        console.log(`Downloaded data for job ${jobId}:`, Array.isArray(data) ? `Array with ${data.length} items` : typeof data);
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          return { status: 'completed', data };
        } else {
          console.log(`⚠️ Job ${jobId} returned empty data - marking as failed`);
          return { status: 'failed' };
        }
      } else {
        console.error(`Failed to download LinkedIn data: ${downloadResponse.status} ${downloadResponse.statusText}`);
        const errorText = await downloadResponse.text();
        console.error(`Error response:`, errorText);
        if (errorText.includes('Snapshot is empty') || errorText.includes('empty')) {
          console.log(`⚠️ Job ${jobId} has empty snapshot - marking as failed`);
          return { status: 'failed' };
        }
      }
      
      // If download failed, mark as failed instead of completed
      return { status: 'failed' };
    }

    return { status: 'running' };
    
  } catch (error) {
    console.error(`Error checking LinkedIn job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Poll LinkedIn job until completion
 * @param jobId - Job ID to poll
 * @param onProgress - Progress callback
 * @param isExisting - Whether this is an existing snapshot
 * @returns LinkedIn data when ready
 */
export async function pollLinkedInJob(
  jobId: string,
  onProgress?: (progress: LinkedInProgress) => void,
  isExisting?: boolean
): Promise<LinkedInData> {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  const pollInterval = 5000; // 5 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      onProgress?.({
        attempt: attempt + 1,
        maxAttempts,
        status: 'polling',
        message: `Checking LinkedIn data... (${attempt + 1}/${maxAttempts})`,
        percentage: (attempt / maxAttempts) * 100
      });

      const result = await checkLinkedInJob(jobId, isExisting);
      
      if (result.status === 'completed' && result.data) {
        onProgress?.({
          attempt: maxAttempts,
          maxAttempts,
          status: 'ready',
          message: 'LinkedIn data ready!',
          percentage: 100
        });
        return processLinkedInData(result.data);
      }
      
      if (result.status === 'failed') {
        throw new Error('LinkedIn job failed');
      }
      
      // Still running, wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      // Retry on error
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  throw new Error('LinkedIn job polling timed out');
}

/**
 * Test function to check a specific job ID with detailed debugging
 * @param jobId - Job ID to test
 * @returns Job status and data
 */
export async function testLinkedInJobId(jobId: string) {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('BRIGHTDATA_API_KEY environment variable is not set');
  }
  
  console.log(`🔍 Testing LinkedIn job ID: ${jobId}`);
  
  try {
    // First, check progress status
    console.log(`1️⃣ Checking progress...`);
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    const progressData = await progressResponse.json();
    console.log(`Progress response (${progressResponse.status}):`, JSON.stringify(progressData, null, 2));
    
    // Try different download endpoints
    const downloadEndpoints = [
      `https://api.brightdata.com/datasets/v3/snapshot/${jobId}/download?format=json`,
      `https://api.brightdata.com/datasets/v3/snapshot/${jobId}?format=json`,
      `https://api.brightdata.com/datasets/v3/snapshot/${jobId}/download`,
      `https://api.brightdata.com/datasets/v3/snapshot/${jobId}`
    ];
    
    for (let i = 0; i < downloadEndpoints.length; i++) {
      const endpoint = downloadEndpoints[i];
      console.log(`${i + 2}️⃣ Trying download endpoint: ${endpoint}`);
      
      try {
        const downloadResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        
        console.log(`Download response ${i + 1} (${downloadResponse.status}):`);
        
        if (downloadResponse.ok) {
          const data = await downloadResponse.json();
          console.log(`Data type:`, typeof data);
          console.log(`Data length:`, Array.isArray(data) ? data.length : Object.keys(data || {}).length);
          console.log(`Raw data sample:`, JSON.stringify(data, null, 2).substring(0, 500) + '...');
          
          if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            console.log(`✅ Found data with endpoint ${i + 1}!`);
            
            try {
              const processedData = processLinkedInData(data);
              console.log(`✅ Processed LinkedIn data:`, {
                name: processedData.name,
                headline: processedData.headline,
                location: processedData.location,
                experienceCount: processedData.experience?.length || 0,
                skillsCount: processedData.skills?.length || 0,
                connections: processedData.connections
              });
              return { success: true, data: processedData, endpoint: endpoint };
            } catch (processError) {
              console.error(`Error processing data:`, processError);
              return { success: false, rawData: data, endpoint: endpoint, error: 'Processing failed' };
            }
          } else {
            console.log(`No usable data from endpoint ${i + 1}`);
          }
        } else {
          const errorText = await downloadResponse.text();
          console.log(`Error response:`, errorText);
        }
      } catch (endpointError) {
        console.error(`Endpoint ${i + 1} failed:`, endpointError);
      }
    }
    
    return { success: false, message: 'No data found from any endpoint', progressData };
    
  } catch (error) {
    console.error(`❌ Test failed for ${jobId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}