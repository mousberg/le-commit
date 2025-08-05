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
    body?: unknown
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
      
      console.log(`[AshbyClient] Making request to ${url}`, {
        method,
        headers: { ...headers, Authorization: '[REDACTED]' },
        bodyLength: typeof requestBody === 'string' ? requestBody.length : 0,
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0
      });

      const response = await fetch(url, {
        method,
        headers,
        body: requestBody
      });

      console.log(`[AshbyClient] Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();
      
      console.log(`[AshbyClient] Response data:`, {
        success: response.ok,
        hasResults: !!data.results,
        hasError: !!data.error,
        candidateCount: data.results?.candidates?.length || 0
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.error?.message || data.message || `API request failed with status ${response.status}`,
            code: data.error?.code || data.code
          }
        };
      }

      // Ashby API wraps responses in a "results" property
      return {
        success: true,
        results: data.results || data
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
    
    // Normalize the response to always have a url property
    if (response.success && response.results) {
      const url = response.results.downloadUrl || response.results.url;
      if (url) {
        return {
          success: true,
          results: { url }
        };
      }
    }
    
    return response as AshbyApiResponse<{ url: string }>;
  }

  // Application Methods
  async updateApplication(params: AshbyApplicationUpdateRequest): Promise<AshbyApiResponse<Record<string, unknown>>> {
    return this.request('/application.change_source', 'POST', params);
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