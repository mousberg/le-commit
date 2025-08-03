'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Trash2, MoreVertical, Trash, Download, Share2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TranscriptModal from '@/components/TranscriptModal';
import ProcessingLoader from '@/components/ProcessingLoader';
import CredibilityScore from '@/components/credibility-score';
import { useApplicants } from '@/lib/contexts/ApplicantContext';
import { NewApplicantForm } from './components/NewApplicantForm';
import GitHubSection from './components/GitHubSection';
import CollapsibleCVSection from './components/CollapsibleCVSection';
import LinkedInProfileSection from './components/LinkedInProfileSection';
import ReferenceManager, { Reference } from './components/ReferenceManager';





function BoardPageContent() {
  const {
    applicants,
    selectedApplicant,
    fetchApplicants,
    selectApplicant,
    deleteApplicant
  } = useApplicants();

  const searchParams = useSearchParams();
  const router = useRouter();

  // NEW URL LOGIC: /board = new form, /board?id=<id> = view applicant
  const urlId = searchParams.get('id');
  const isNewForm = !urlId; // If no id parameter, show new form

  // Navigation helpers - use replace for cleaner history
  const navigateToApplicant = useCallback((id: string) => {
    router.replace(`/board?id=${id}`);
  }, [router]);

  const navigateToNew = useCallback(() => {
    router.replace('/board'); // Just /board for new form
  }, [router]);

  // Load applicants on component mount
  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Sync URL parameter with ApplicantContext selection
  useEffect(() => {
    if (urlId && urlId !== selectedApplicant?.id) {
      selectApplicant(urlId);
    } else if (!urlId && selectedApplicant) {
      selectApplicant(null);
    }
  }, [urlId, selectedApplicant?.id, selectApplicant]);

  // Real-time updates now handled by ApplicantContext - no polling needed!

  // Handle successful applicant creation from NewApplicantForm
  const handleApplicantCreated = useCallback((applicantId: string) => {
    console.log('Applicant created:', applicantId);
    // Navigate to the newly created applicant to show processing status
    navigateToApplicant(applicantId);
  }, [navigateToApplicant]);

  const handleDeleteApplicant = async (applicantId: string, applicantName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      applicantId,
      applicantName
    });
  };

  const confirmDeleteApplicant = async () => {
    const { applicantId } = deleteConfirmModal;

    await deleteApplicant(applicantId);

    // After deletion, always navigate to the new applicant page to refresh the view
    navigateToNew();

    setDeleteConfirmModal({ isOpen: false, applicantId: '', applicantName: '' });
  };

  const cancelDeleteApplicant = () => {
    setDeleteConfirmModal({ isOpen: false, applicantId: '', applicantName: '' });
  };

  const selectedCandidate = isNewForm ? null : selectedApplicant;

  const [referencesByCandidate, setReferencesByCandidate] = useState<{ [id: string]: Reference[] }>({});
  const [callInProgress, setCallInProgress] = useState(false);
  const [transcriptModal, setTranscriptModal] = useState({
    isOpen: false,
    conversationId: '',
    referenceName: ''
  });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    applicantId: '',
    applicantName: ''
  });

  const selectedCandidateId = selectedCandidate ? selectedCandidate.id : null;
  const candidateReferences = selectedCandidateId ? referencesByCandidate[selectedCandidateId] || [] : [];

  // Handler for adding a new reference
  const handleAddReference = (reference: Reference) => {
    if (!selectedCandidateId) return;
    setReferencesByCandidate(prev => ({
      ...prev,
      [selectedCandidateId]: [reference, ...(prev[selectedCandidateId] || [])]
    }));
  };

  const generateSummaryForReference = async (referenceId: string, conversationId: string) => {
    if (!selectedCandidateId) return;

    try {
      // Fetch the transcript
      const transcriptResponse = await fetch(`/api/get-transcript?conversationId=${conversationId}`);
      const transcriptData = await transcriptResponse.json();

      if (transcriptData.success && transcriptData.hasTranscript && transcriptData.transcript) {
        // Generate summary using the transcript
        const summaryResponse = await fetch('/api/summarize-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: transcriptData.transcript })
        });

        const summaryData = await summaryResponse.json();

        if (summaryData.success && summaryData.summary) {
          // Update the reference with the generated summary
          setReferencesByCandidate(prev => ({
            ...prev,
            [selectedCandidateId]: prev[selectedCandidateId].map(ref =>
              ref.id === referenceId ? { ...ref, summary: summaryData.summary } : ref
            )
          }));
          console.log('Summary generated for reference:', referenceId, summaryData.summary);
        }
      } else {
        // If transcript is not ready yet, try again in 15 seconds
        setTimeout(() => generateSummaryForReference(referenceId, conversationId), 15000);
      }
    } catch (error) {
      console.error('Failed to generate summary for reference:', referenceId, error);
      // Retry once after 30 seconds on error
      setTimeout(() => generateSummaryForReference(referenceId, conversationId), 30000);
    }
  };
  const handleCallReference = async (reference: Reference) => {
    if (callInProgress || !selectedCandidateId || !selectedCandidate) return;
    setCallInProgress(true);
    setReferencesByCandidate(prev => ({
      ...prev,
      [selectedCandidateId]: prev[selectedCandidateId].map(ref =>
        ref.id === reference.id ? { ...ref, callStatus: 'calling' as const } : ref
      )
    }));
    try {
      const response = await fetch('/api/reference-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: reference.phoneNumber,
          candidateName: selectedCandidate.name,
          referenceName: reference.name,
          companyName: reference.companyName || 'Previous Company',
          roleTitle: reference.roleTitle || selectedCandidate.cv_data?.jobTitle || selectedCandidate.li_data?.headline || '',
          workDuration: reference.workDuration || ''
        })
      });
      const data = await response.json();
      if (data.success) {
        setReferencesByCandidate(prev => ({
          ...prev,
          [selectedCandidateId]: prev[selectedCandidateId].map(ref =>
            ref.id === reference.id ? { ...ref, callStatus: 'completed' as const, conversationId: data.conversationId } : ref
          )
        }));
        alert(`Call initiated successfully! Conversation ID: ${data.conversationId}`);

        // Schedule automatic summary generation after a delay to allow transcript processing
        setTimeout(async () => {
          await generateSummaryForReference(reference.id, data.conversationId);
        }, 10000); // Wait 10 seconds for transcript to be available
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error) {
      setReferencesByCandidate(prev => ({
        ...prev,
        [selectedCandidateId]: prev[selectedCandidateId].map(ref =>
          ref.id === reference.id ? { ...ref, callStatus: 'failed' as const } : ref
        )
      }));
      alert(`Failed to initiate call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCallInProgress(false);
    }
  };
  const handleViewTranscript = async (reference: Reference) => {
    if (reference.conversationId) {
      setTranscriptModal({
        isOpen: true,
        conversationId: reference.conversationId,
        referenceName: reference.name
      });

      // Auto-generate summary if it doesn't exist
      if (!reference.summary && selectedCandidateId) {
        try {
          // First fetch the transcript
          const transcriptResponse = await fetch(`/api/get-transcript?conversationId=${reference.conversationId}`);
          const transcriptData = await transcriptResponse.json();

          if (transcriptData.success && transcriptData.hasTranscript && transcriptData.transcript) {
            // Generate summary using the transcript
            const summaryResponse = await fetch('/api/summarize-transcript', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript: transcriptData.transcript })
            });

            const summaryData = await summaryResponse.json();

            if (summaryData.success && summaryData.summary) {
              // Update the reference with the generated summary
              setReferencesByCandidate(prev => ({
                ...prev,
                [selectedCandidateId]: prev[selectedCandidateId].map(ref =>
                  ref.id === reference.id ? { ...ref, summary: summaryData.summary } : ref
                )
              }));
            }
          }
        } catch (error) {
          console.error('Failed to generate summary:', error);
        }
      }
    }
  };
  const closeTranscriptModal = () => {
    setTranscriptModal({ isOpen: false, conversationId: '', referenceName: '' });
  };

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Main Content */}
        <main className="p-10">
        {isNewForm ? (
            <NewApplicantForm onSuccess={handleApplicantCreated} />
          ) : selectedCandidate ? (
            // Show processing loader for uploading/processing/analyzing states OR if any individual processing is still running
            (selectedCandidate.status === 'uploading' ||
             selectedCandidate.status === 'processing' ||
             selectedCandidate.status === 'analyzing' ||
             selectedCandidate.cv_status === 'processing' ||
             selectedCandidate.li_status === 'processing' ||
             selectedCandidate.gh_status === 'processing' ||
             selectedCandidate.ai_status === 'processing') ? (
              <ProcessingLoader
                status={
                  selectedCandidate.status === 'uploading' ? 'uploading' :
                  selectedCandidate.status === 'analyzing' ? 'analyzing' :
                  'processing'
                }
                fileName={selectedCandidate.cv_file_id ? 'CV File' : undefined}
                applicant={selectedCandidate}
              />
            ) : (
            <div className="max-w-4xl mx-auto">
              {/* Compact Header */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => router.push('/board/applicants')}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                        title="Back to Applicants"
                      >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-2xl font-semibold text-gray-900">{selectedCandidate.name}</h2>
                      <div className="flex items-center gap-2">
                        {selectedCandidate.cv_data && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200 font-medium">
                            CV ✓
                          </span>
                        )}
                        {selectedCandidate.li_data && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200 font-medium">
                            LinkedIn ✓
                          </span>
                        )}
                        {selectedCandidate.gh_data && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-200 font-medium">
                            GitHub ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600">
                      {selectedCandidate.cv_data?.jobTitle ||
                       selectedCandidate.li_data?.headline ||
                       'Position not specified'}
                    </p>
                    {selectedCandidate.email && (
                      <p className="text-sm text-gray-500">{selectedCandidate.email}</p>
                    )}
                  </div>

                  {/* Actions Menu */}
                  <div className="relative group">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export Profile
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        Share
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={() => handleDeleteApplicant(selectedCandidate.id, selectedCandidate.name)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash className="h-4 w-4" />
                        Delete Candidate
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credibility Analysis */}
              {selectedCandidate.ai_data && (
                <div className="mb-6">
                  <CredibilityScore analysisResult={selectedCandidate.ai_data} />
                </div>
              )}

              {/* CV vs LinkedIn Comparison - Temporarily disabled for type compatibility */}
              {/* TODO: Update DataComparisonSection to handle LinkedInData type properly */}

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* CV Section */}
                {selectedCandidate.cv_data && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <CollapsibleCVSection cvData={selectedCandidate.cv_data} />
                  </div>
                )}

                {/* LinkedIn Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  {selectedCandidate.li_data ? (
                    <LinkedInProfileSection linkedinData={selectedCandidate.li_data} />
                  ) : (selectedCandidate.li_status as string) === 'processing' ? (
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">💼</span>
                        <h3 className="text-lg font-semibold text-gray-700">LinkedIn</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1  border border-blue-200 font-medium animate-pulse">
                          Processing...
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">LinkedIn data is being processed in the background.</p>
                    </div>
                  ) : selectedCandidate.li_status === 'error' ? (
                    <div className="p-6 opacity-60">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl opacity-50">💼</span>
                        <h3 className="text-lg font-semibold text-gray-500">LinkedIn</h3>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1  border border-red-200 font-medium">
                          Failed
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">LinkedIn processing failed.</p>
                    </div>
                  ) : (
                    <div className="p-6 opacity-60">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl opacity-50">💼</span>
                        <h3 className="text-lg font-semibold text-gray-500">LinkedIn</h3>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 ">Not Available</span>
                      </div>
                      <p className="text-gray-500 text-sm">LinkedIn data not provided for this candidate.</p>
                    </div>
                  )}
                </div>

                {/* GitHub Section - Full Width if available */}
                {(selectedCandidate.gh_data || !selectedCandidate.cv_data) && (
                  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${selectedCandidate.gh_data ? 'lg:col-span-2' : ''}`}>
                    {selectedCandidate.gh_data ? (
                      <GitHubSection githubData={selectedCandidate.gh_data} />
                    ) : (
                      <div className="p-6 opacity-60">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl opacity-50">🐙</span>
                          <h3 className="text-lg font-semibold text-gray-500">GitHub</h3>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 ">Not Available</span>
                        </div>
                        <p className="text-gray-500 text-sm">GitHub data not provided for this candidate.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Processing status message */}
              {selectedCandidate.status === 'failed' && (
                <div className="bg-red-50 border border-red-200  p-4">
                  <p className="text-red-700">
                    Processing failed. Please try uploading again.
                  </p>
                </div>
              )}

              {/* Reference Calls & Start Interview */}
              <ReferenceManager
                references={candidateReferences}
                onAddReference={handleAddReference}
                onCallReference={handleCallReference}
                onViewTranscript={handleViewTranscript}
                callInProgress={callInProgress}
              />

              {/* Start Interview Button */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <Button
                  size="lg"
                  className="w-full  bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 text-lg font-medium shadow-sm transition-all duration-200"
                >
                  Start Interview
                </Button>
              </div>
            </div>
            )
          ) : null}
        </main>
        </div>
      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={transcriptModal.isOpen}
        onClose={closeTranscriptModal}
        conversationId={transcriptModal.conversationId}
        referenceName={transcriptModal.referenceName}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white  shadow-2xl border border-gray-200 w-full max-w-md p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12  bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Applicant
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong>{deleteConfirmModal.applicantName}</strong>? This action cannot be undone.
              </p>
                             <div className="flex gap-3 justify-center">
                 <Button
                   variant="outline"
                   onClick={cancelDeleteApplicant}
                   className="px-6"
                 >
                   Cancel
                 </Button>
                 <Button
                   onClick={confirmDeleteApplicant}
                   className="px-6 bg-red-600 hover:bg-red-700 text-white"
                 >
                   Delete
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BoardPageContent />
    </Suspense>
  );
}
