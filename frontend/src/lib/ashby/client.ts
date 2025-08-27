// Ashby API Client for Unmask Integration

import {
  AshbyAuth,
  AshbyCandidate,
  AshbyCandidateListRequest,
  AshbyCandidateListResponse,
  AshbyCandidateUpdateRequest,
  AshbyResumeUploadRequest,
  AshbyResumeUploadResponse,
  AshbyApplicationUpdateRequest,
  AshbyCustomFieldSetValueRequest,
  AshbyCustomFieldSetValueResponse,
  AshbyCreateNoteRequest,
  AshbyCreateNoteResponse,
  AshbyApiResponse
} from './types';

export class AshbyClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(auth: AshbyAuth) {
    this.apiKey = auth.apiKey;
    this.baseUrl = auth.baseUrl || 'https://api.ashbyhq.com';
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'POST',
    body?: unknown,
    retryCount = 0
  ): Promise<AshbyApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Accept': 'application/json; version=1'
      };

      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const url = `${this.baseUrl}${endpoint}`;
      const requestBody = body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;
      
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody
      });

      // Read response body once and handle different content types
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch {
        // Handle cases where Ashby returns HTML error pages instead of JSON
        
        // Enhanced rate limit detection
        const isRateLimit = responseText.toLowerCase().includes('too many') || 
                           responseText.toLowerCase().includes('rate limit') ||
                           responseText.toLowerCase().includes('throttle') ||
                           response.status === 429;
        
        if (isRateLimit) {
          // Rate limit detected - retry with exponential backoff
          if (retryCount < 3) { // Increased retry attempts for rate limits
            const delay = Math.pow(2, retryCount) * 2000; // Longer delays: 2s, 4s, 8s
            console.warn(`[AshbyClient] Rate limit detected, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.request(endpoint, method, body, retryCount + 1);
          }
          return {
            success: false,
            error: { 
              message: 'Rate limit exceeded - Ashby API temporarily unavailable',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: 60 // Suggest waiting 60 seconds
            }
          };
        }
        
        // Handle other non-JSON responses
        return {
          success: false,
          error: { 
            message: `Invalid JSON response from Ashby API: ${responseText.substring(0, 150)}...`,
            code: 'INVALID_JSON_RESPONSE'
          }
        };
      }
      
      // Only log failures, not successful requests
      if (!response.ok) {
        console.error(`[AshbyClient] Request failed to ${url}`, {
          method,
          status: response.status,
          statusText: response.statusText,
          headers: { ...headers, Authorization: '[REDACTED]' },
          bodyLength: typeof requestBody === 'string' ? requestBody.length : 0,
          responseData: data
        });
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.error?.message || data.message || `API request failed with status ${response.status}`,
            code: data.error?.code || data.code
          }
        };
      }

      // Return the full Ashby API response to preserve pagination metadata
      return {
        success: true,
        results: data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }

  // Candidate Methods
  async listCandidates(params?: AshbyCandidateListRequest): Promise<AshbyApiResponse<AshbyCandidateListResponse>> {
    return this.request<AshbyCandidateListResponse>('/candidate.list', 'POST', params);
  }

  async getCandidate(candidateId: string): Promise<AshbyApiResponse<AshbyCandidate>> {
    return this.request<AshbyCandidate>('/candidateInformationRetrieval', 'POST', {
      candidateId
    });
  }

  async updateCandidate(params: AshbyCandidateUpdateRequest): Promise<AshbyApiResponse<AshbyCandidate>> {
    const { candidateId, customFields, tags } = params;
    
    const body: Record<string, unknown> = {
      candidateId
    };

    if (customFields) {
      body.customFields = customFields;
    }

    if (tags) {
      if (tags.add) body.addTags = tags.add;
      if (tags.remove) body.removeTags = tags.remove;
    }

    return this.request<AshbyCandidate>('/candidate.update', 'POST', body);
  }

  // Resume Methods
  async uploadResume(params: AshbyResumeUploadRequest): Promise<AshbyApiResponse<AshbyResumeUploadResponse>> {
    const formData = new FormData();
    formData.append('candidateId', params.candidateId);
    
    const blob = new Blob([params.file], { type: params.contentType || 'application/pdf' });
    formData.append('file', blob, params.filename);

    return this.request<AshbyResumeUploadResponse>('/candidate.uploadResume', 'POST', formData);
  }

  async getResumeUrl(fileHandle: string): Promise<AshbyApiResponse<{ url: string }>> {
    const response = await this.request<{ downloadUrl?: string; url?: string }>('/file.info', 'POST', {
      fileHandle
    });
    
    // Enhanced logging for debugging file access issues
    if (!response.success) {
      console.error(`[AshbyClient] File URL request failed:`, {
        fileHandle: fileHandle.substring(0, 20) + '...',
        error: response.error?.message,
        code: response.error?.code
      });
    }
    
    // Normalize the response to always have a url property
    if (response.success && response.results) {
      // Check both the direct structure and nested results structure
      const url = response.results.downloadUrl || 
                  response.results.url || 
                  (response.results as any).results?.url;
      
      if (url) {
        return {
          success: true,
          results: { url }
        };
      } else {
        console.error(`[AshbyClient] File URL response missing URL:`, {
          fileHandle: fileHandle.substring(0, 20) + '...',
          results: response.results
        });
      }
    }
    
    return response as AshbyApiResponse<{ url: string }>;
  }

  // Application Methods
  async updateApplication(params: AshbyApplicationUpdateRequest): Promise<AshbyApiResponse<Record<string, unknown>>> {
    return this.request('/application.change_source', 'POST', params);
  }

  // Custom Field Methods
  async setCustomFieldValue(params: AshbyCustomFieldSetValueRequest): Promise<AshbyApiResponse<AshbyCustomFieldSetValueResponse>> {
    return this.request<AshbyCustomFieldSetValueResponse>('/customField.setValue', 'POST', params);
  }

  // Note Methods
  async createNote(params: AshbyCreateNoteRequest): Promise<AshbyApiResponse<AshbyCreateNoteResponse>> {
    return this.request<AshbyCreateNoteResponse>('/candidate.createNote', 'POST', params);
  }

  // Helper Methods for Unmask Integration
  async syncUnmaskResults(
    candidateId: string,
    unmaskData: {
      score: number;
      verificationStatus: 'verified' | 'flagged' | 'pending';
      flags: Array<{ type: string; message: string }>;
      reportUrl: string;
    }
  ): Promise<AshbyApiResponse<AshbyCandidate>> {
    // Prepare custom fields based on Unmask data
    const customFields: Record<string, unknown> = {
      unmask_score: unmaskData.score,
      unmask_verification_status: unmaskData.verificationStatus,
      unmask_report_url: unmaskData.reportUrl,
      unmask_flags: JSON.stringify(unmaskData.flags)
    };

    // Determine tags based on verification status
    const tags: { add?: string[]; remove?: string[] } = {};
    
    switch (unmaskData.verificationStatus) {
      case 'verified':
        tags.add = ['unmask-verified'];
        tags.remove = ['unmask-pending', 'unmask-flagged'];
        break;
      case 'flagged':
        tags.add = ['unmask-flagged'];
        tags.remove = ['unmask-pending', 'unmask-verified'];
        break;
      case 'pending':
        tags.add = ['unmask-pending'];
        tags.remove = ['unmask-verified', 'unmask-flagged'];
        break;
    }

    return this.updateCandidate({
      candidateId,
      customFields,
      tags
    });
  }

  // Batch Operations
  async batchSyncCandidates(
    candidates: Array<{ 
      ashbyId: string; 
      unmaskId: string;
      score: number;
      verificationStatus: 'verified' | 'flagged' | 'pending';
    }>
  ): Promise<Array<{ ashbyId: string; success: boolean; error?: string }>> {
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const response = await this.updateCandidate({
            candidateId: candidate.ashbyId,
            customFields: {
              unmask_id: candidate.unmaskId,
              unmask_score: candidate.score,
              unmask_verification_status: candidate.verificationStatus
            }
          });

          return {
            ashbyId: candidate.ashbyId,
            success: response.success,
            error: response.error?.message
          };
        } catch (error) {
          return {
            ashbyId: candidate.ashbyId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return results;
  }
}