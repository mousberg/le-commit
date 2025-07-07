'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import TranscriptModal from '../../components/TranscriptModal';
import ProcessingLoader from '../../components/ProcessingLoader';
import { useApplicants } from '../../lib/contexts/ApplicantContext';



// Add Reference and Transcript types from /reference
interface Reference {
  id: string;
  name: string;
  phoneNumber: string;
  companyName: string;
  roleTitle: string;
  workDuration: string;
  dateAdded: string;
  callStatus?: 'idle' | 'calling' | 'completed' | 'failed';
  conversationId?: string;
}

interface ReferenceFormData {
  name: string;
  phoneNumber: string;
  companyName: string;
  roleTitle: string;
  workDuration: string;
}

function BoardPageContent() {
  const {
    applicants,
    fetchApplicants,
    createApplicant,
    refreshApplicant,
    isLoading
  } = useApplicants();

  const searchParams = useSearchParams();
  const router = useRouter();

  const [showNotes, setShowNotes] = useState(false);

  // Get current selection from URL or determine default
  const urlId = searchParams.get('id');
  const selectedId = urlId || (applicants.length > 0 ? applicants[0].id : 'new');

    // Navigation helpers
  const navigateToApplicant = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('id', id);
    router.push(`/board?${params.toString()}`);
  }, [searchParams, router]);

  const navigateToNew = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set('id', 'new');
    router.push(`/board?${params.toString()}`);
  }, [searchParams, router]);

  // File upload state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');

  // File input refs
  const cvInputRef = useRef<HTMLInputElement>(null);
  const linkedinInputRef = useRef<HTMLInputElement>(null);

  // Load applicants on component mount
  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Auto-refresh processing applicants
  useEffect(() => {
    const interval = setInterval(() => {
      applicants.forEach(applicant => {
        if (applicant.status === 'processing' || applicant.status === 'uploading') {
          refreshApplicant(applicant.id);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [applicants, refreshApplicant]);

  // Auto-navigate to first applicant if no URL param and applicants exist
  // If no applicants exist, default to 'new' form
  useEffect(() => {
    if (!urlId) {
      if (applicants.length > 0) {
        navigateToApplicant(applicants[0].id);
      } else {
        navigateToNew();
      }
    }
  }, [urlId, applicants, navigateToApplicant, navigateToNew]);

  const handleCreateCandidate = async () => {
    if (!cvFile) {
      alert('Please select a CV file');
      return;
    }

    const applicantId = await createApplicant({
      cvFile,
      linkedinFile: linkedinFile || undefined,
      githubUrl: githubUrl.trim() || undefined
    });

    if (applicantId) {
      // Reset form
      setCvFile(null);
      setLinkedinFile(null);
      setGithubUrl('');

      // Reset file inputs
      if (cvInputRef.current) cvInputRef.current.value = '';
      if (linkedinInputRef.current) linkedinInputRef.current.value = '';

      // Navigate to the new applicant
      navigateToApplicant(applicantId);
    }
  };

  const selectedCandidate = selectedId === 'new' ? null : applicants.find(a => a.id === selectedId);

  const [referencesByCandidate, setReferencesByCandidate] = useState<{ [id: string]: Reference[] }>({});
  const [addingReference, setAddingReference] = useState(false);
  const [newReferenceForm, setNewReferenceForm] = useState<ReferenceFormData>({
    name: '', phoneNumber: '', companyName: '', roleTitle: '', workDuration: ''
  });
  const [openReferenceId, setOpenReferenceId] = useState<string | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [transcriptModal, setTranscriptModal] = useState({
    isOpen: false,
    conversationId: '',
    referenceName: ''
  });

  const selectedCandidateId = selectedCandidate ? selectedCandidate.id : null;
  const candidateReferences = selectedCandidateId ? referencesByCandidate[selectedCandidateId] || [] : [];

  const handleStartAddReference = () => {
    setAddingReference(true);
    setNewReferenceForm({ name: '', phoneNumber: '', companyName: '', roleTitle: '', workDuration: '' });
  };
  const handleCancelAddReference = () => {
    setAddingReference(false);
    setNewReferenceForm({ name: '', phoneNumber: '', companyName: '', roleTitle: '', workDuration: '' });
  };
  const handleNewReferenceFormChange = (field: keyof ReferenceFormData, value: string) => {
    setNewReferenceForm(prev => ({ ...prev, [field]: value }));
  };
  const handleConfirmAddReference = () => {
    if (!selectedCandidateId) return;
    if (newReferenceForm.name.trim() && newReferenceForm.phoneNumber.trim()) {
      const reference: Reference = {
        id: Date.now().toString(),
        name: newReferenceForm.name.trim(),
        phoneNumber: newReferenceForm.phoneNumber.trim(),
        companyName: newReferenceForm.companyName.trim(),
        roleTitle: newReferenceForm.roleTitle.trim(),
        workDuration: newReferenceForm.workDuration.trim(),
        dateAdded: new Date().toLocaleDateString(),
        callStatus: 'idle'
      };
      setReferencesByCandidate(prev => ({
        ...prev,
        [selectedCandidateId]: [reference, ...(prev[selectedCandidateId] || [])]
      }));
      setAddingReference(false);
      setNewReferenceForm({ name: '', phoneNumber: '', companyName: '', roleTitle: '', workDuration: '' });
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
          roleTitle: reference.roleTitle || selectedCandidate.role,
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
  const handleViewTranscript = (reference: Reference) => {
    if (reference.conversationId) {
      setTranscriptModal({
        isOpen: true,
        conversationId: reference.conversationId,
        referenceName: reference.name
      });
    }
  };
  const closeTranscriptModal = () => {
    setTranscriptModal({ isOpen: false, conversationId: '', referenceName: '' });
  };
  const getCallButtonText = (status?: Reference['callStatus']) => {
    switch (status) {
      case 'calling': return 'Calling...';
      case 'completed': return 'Called ✓';
      case 'failed': return 'Failed - Retry';
      default: return 'Call Reference';
    }
  };
  const getCallButtonVariant = (status?: Reference['callStatus']) => {
    switch (status) {
      case 'calling': return 'secondary';
      case 'completed': return 'outline';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <>
      <div className="min-h-screen flex bg-gradient-to-b from-white via-slate-50 to-white">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-100 flex flex-col py-6 px-4 gap-4">
          <div className="mb-4">
            <div className="text-lg font-semibold mb-2">Applicants</div>
            <ul className="space-y-1">
              {applicants.map(applicant => (
                <li key={applicant.id}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${selectedId === applicant.id ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-gray-800'}`}
                    onClick={() => navigateToApplicant(applicant.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{applicant.name}</span>
                      {applicant.status === 'processing' && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Processing...
                        </span>
                      )}
                      {applicant.status === 'uploading' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Uploading...
                        </span>
                      )}
                      {applicant.status === 'failed' && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          Failed
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Button
            onClick={navigateToNew}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold shadow-sm"
          >
            + Add New Applicant
          </Button>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-10">
        {selectedId === 'new' ? (
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col gap-8">
              <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">Add New Applicant</h2>
              <div className="flex flex-col gap-6">
                {/* CV Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-gray-800 mb-1">
                    Upload CV <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={cvInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {cvFile && (
                    <p className="text-sm text-green-600">✓ {cvFile.name}</p>
                  )}
                </div>
                {/* LinkedIn Profile Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-gray-800 mb-1">Upload LinkedIn Profile (Optional)</label>
                  <input
                    ref={linkedinInputRef}
                    type="file"
                    accept=".pdf,.html,.txt"
                    onChange={(e) => setLinkedinFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {linkedinFile && (
                    <p className="text-sm text-green-600">✓ {linkedinFile.name}</p>
                  )}
                </div>
                {/* GitHub Profile URL */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-gray-800 mb-1">GitHub Profile (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://github.com/username"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {githubUrl && (
                    <p className="text-sm text-green-600">✅ GitHub URL entered</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleCreateCandidate}
                disabled={!cvFile || isLoading}
                size="lg"
                className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-8 py-3 text-xl font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Analyse Profile'}
              </Button>
            </div>
          ) : selectedCandidate ? (
            // Show processing loader for uploading/processing states
            selectedCandidate.status === 'uploading' || selectedCandidate.status === 'processing' ? (
              <ProcessingLoader
                applicantName={selectedCandidate.name}
                status={selectedCandidate.status}
                fileName={selectedCandidate.originalFileName}
              />
            ) : (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col gap-8">
              {/* Applicant Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-1">{selectedCandidate.name}</h2>
                  <p className="text-lg text-gray-600">{selectedCandidate.role || 'Position not specified'}</p>
                  {selectedCandidate.email && (
                    <p className="text-sm text-gray-500">{selectedCandidate.email}</p>
                  )}
                </div>
                <div className="flex flex-col md:items-end gap-2">
                  <div className="flex gap-4">
                    <span className="text-emerald-600">CV ✓</span>
                    {selectedCandidate.linkedinData ? (
                      <span className="text-blue-600">LinkedIn ✓</span>
                    ) : (
                      <span className="text-gray-400">LinkedIn</span>
                    )}
                    {selectedCandidate.githubData ? (
                      <span className="text-purple-600">GitHub ✓</span>
                    ) : (
                      <span className="text-gray-400">GitHub</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCandidate.score && (
                      <div className="text-2xl font-bold text-emerald-600">{selectedCandidate.score}%</div>
                    )}
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedCandidate.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedCandidate.status}
                    </div>
                  </div>
                </div>
              </div>

              {/* CV Data Summary */}
              {selectedCandidate.cvData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCandidate.cvData.professionalSummary && (
                    <div className="col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Summary</h3>
                      <p className="text-gray-700 text-sm">{selectedCandidate.cvData.professionalSummary}</p>
                    </div>
                  )}

                  {selectedCandidate.cvData.skills && selectedCandidate.cvData.skills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.cvData.skills.slice(0, 10).map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                        {selectedCandidate.cvData.skills.length > 10 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{selectedCandidate.cvData.skills.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.cvData.professionalExperiences && selectedCandidate.cvData.professionalExperiences.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Experience</h3>
                      <div className="space-y-2">
                        {selectedCandidate.cvData.professionalExperiences.slice(0, 3).map((exp, i) => (
                          <div key={i} className="text-sm">
                            <div className="font-medium">{exp.title} at {exp.companyName}</div>
                            <div className="text-gray-600">
                              {exp.startMonth ? `${exp.startMonth}/` : ''}{exp.startYear} - {
                                exp.ongoing ? 'Present' :
                                (exp.endMonth ? `${exp.endMonth}/` : '') + (exp.endYear || '')
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LinkedIn Data Summary */}
              {selectedCandidate.linkedinData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
                  <div className="col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">LinkedIn Profile Data</h3>
                  </div>

                  {selectedCandidate.linkedinData.professionalSummary && (
                    <div className="col-span-2">
                      <h4 className="text-md font-medium text-gray-800 mb-1">Professional Summary</h4>
                      <p className="text-gray-700 text-sm">{selectedCandidate.linkedinData.professionalSummary}</p>
                    </div>
                  )}

                  {selectedCandidate.linkedinData.jobTitle && (
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-1">Current Role</h4>
                      <p className="text-gray-700 text-sm">{selectedCandidate.linkedinData.jobTitle}</p>
                    </div>
                  )}

                  {selectedCandidate.linkedinData.professionalExperiences && selectedCandidate.linkedinData.professionalExperiences.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">LinkedIn Experience</h4>
                      <div className="space-y-2">
                        {selectedCandidate.linkedinData.professionalExperiences.slice(0, 3).map((exp, i) => (
                          <div key={i} className="text-sm">
                            <div className="font-medium">{exp.title} at {exp.companyName}</div>
                            <div className="text-gray-600">
                              {exp.startMonth ? `${exp.startMonth}/` : ''}{exp.startYear} - {
                                exp.ongoing ? 'Present' :
                                (exp.endMonth ? `${exp.endMonth}/` : '') + (exp.endYear || '')
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.linkedinData.skills && selectedCandidate.linkedinData.skills.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">LinkedIn Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.linkedinData.skills.slice(0, 8).map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs border border-blue-200">
                            {skill}
                          </span>
                        ))}
                        {selectedCandidate.linkedinData.skills.length > 8 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{selectedCandidate.linkedinData.skills.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.linkedinData.educations && selectedCandidate.linkedinData.educations.length > 0 && (
                    <div className="col-span-2">
                      <h4 className="text-md font-medium text-gray-800 mb-2">LinkedIn Education</h4>
                      <div className="space-y-2">
                        {selectedCandidate.linkedinData.educations.slice(0, 2).map((edu, i) => (
                          <div key={i} className="text-sm">
                            <div className="font-medium">{edu.degree} at {edu.institution}</div>
                            <div className="text-gray-600">
                              {edu.startYear} - {edu.ongoing ? 'Present' : (edu.endYear || '')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* GitHub Data Summary */}
              {selectedCandidate.githubData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
                  <div className="col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      🐙 GitHub Profile Data
                      <a 
                        href={selectedCandidate.githubData.profileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-sm text-purple-600 hover:text-purple-800"
                      >
                        @{selectedCandidate.githubData.username} ↗
                      </a>
                    </h3>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-2">Activity Overview</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Public Repos:</span>
                        <span className="font-medium">{selectedCandidate.githubData.publicRepos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Followers:</span>
                        <span className="font-medium">{selectedCandidate.githubData.followers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Stars:</span>
                        <span className="font-medium">{selectedCandidate.githubData.starredRepos}</span>
                      </div>
                      {selectedCandidate.githubData.contributions && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Streak:</span>
                          <span className="font-medium">{selectedCandidate.githubData.contributions.streakDays} days</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedCandidate.githubData.languages && selectedCandidate.githubData.languages.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Top Languages</h4>
                      <div className="space-y-1">
                        {selectedCandidate.githubData.languages.slice(0, 5).map((lang, i) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">{lang.language}</span>
                            <span className="text-gray-500">{lang.percentage.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.githubData.repositories && selectedCandidate.githubData.repositories.length > 0 && (
                    <div className="col-span-2">
                      <h4 className="text-md font-medium text-gray-800 mb-2">Notable Repositories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedCandidate.githubData.repositories
                          .filter(repo => !repo.isFork && repo.stars > 0)
                          .slice(0, 4)
                          .map((repo, i) => (
                            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-sm">{repo.name}</span>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span>⭐ {repo.stars}</span>
                                  <span>🍴 {repo.forks}</span>
                                </div>
                              </div>
                              {repo.description && (
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{repo.description}</p>
                              )}
                              {repo.language && (
                                <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                                  {repo.language}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.githubData.overallQualityScore && (
                    <div className="col-span-2">
                      <h4 className="text-md font-medium text-gray-800 mb-2">Code Quality Metrics</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Overall Quality Score</span>
                          <span className="text-lg font-bold text-emerald-600">
                            {selectedCandidate.githubData.overallQualityScore.overall}/100
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">README:</span>
                            <span>{selectedCandidate.githubData.overallQualityScore.readme}/100</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">CI/CD:</span>
                            <span>{selectedCandidate.githubData.overallQualityScore.cicd}/100</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Documentation:</span>
                            <span>{selectedCandidate.githubData.overallQualityScore.documentation}/100</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Processing status message */}
              {selectedCandidate.status === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">
                    Processing failed. Please try uploading again.
                  </p>
                </div>
              )}

              {/* Reference Calls */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Reference Calls</h3>
                  <Button size="sm" onClick={handleStartAddReference} className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={addingReference}>+ Add Reference</Button>
                </div>
                <div className="space-y-4">
                  {addingReference && (
                    <div className="border border-gray-200 rounded-xl bg-slate-50 p-6 flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <input
                          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
                          placeholder="Reference Name*"
                          value={newReferenceForm.name}
                          onChange={e => handleNewReferenceFormChange('name', e.target.value)}
                        />
                        <input
                          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
                          placeholder="Phone Number*"
                          value={newReferenceForm.phoneNumber}
                          onChange={e => handleNewReferenceFormChange('phoneNumber', e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <input
                          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
                          placeholder="Company Name"
                          value={newReferenceForm.companyName}
                          onChange={e => handleNewReferenceFormChange('companyName', e.target.value)}
                        />
                        <input
                          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
                          placeholder="Role Title"
                          value={newReferenceForm.roleTitle}
                          onChange={e => handleNewReferenceFormChange('roleTitle', e.target.value)}
                        />
                      </div>
                      <input
                        className="border rounded-md px-3 py-2 text-gray-800 w-full"
                        placeholder="Work Duration"
                        value={newReferenceForm.workDuration}
                        onChange={e => handleNewReferenceFormChange('workDuration', e.target.value)}
                      />
                      <div className="flex gap-3 mt-2">
                        <Button variant="outline" onClick={handleCancelAddReference} size="sm">Cancel</Button>
                        <Button onClick={handleConfirmAddReference} disabled={!newReferenceForm.name.trim() || !newReferenceForm.phoneNumber.trim()} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">Confirm</Button>
                      </div>
                    </div>
                  )}
                  {candidateReferences.map((reference) => (
                    <div key={reference.id} className="border border-gray-200 rounded-xl">
                      <button
                        className="w-full flex justify-between items-center px-6 py-4 bg-slate-50 rounded-t-xl focus:outline-none"
                        onClick={() => setOpenReferenceId(openReferenceId === reference.id ? null : reference.id)}
                      >
                        <span className="font-semibold text-gray-800">{reference.name}</span>
                        <span className="text-gray-500 text-sm">{reference.phoneNumber}</span>
                        <span className="ml-2 text-xs text-gray-400">{openReferenceId === reference.id ? '▲' : '▼'}</span>
                      </button>
                      {openReferenceId === reference.id && (
                        <div className="px-6 pb-6 pt-2">
                          <div className="mb-2 text-sm text-gray-600">{reference.companyName} {reference.roleTitle && `| ${reference.roleTitle}`} {reference.workDuration && `| ${reference.workDuration}`}</div>
                          <div className="mb-2 text-xs text-gray-400">Added: {reference.dateAdded}</div>
                          <div className="flex gap-2 mb-2">
                            <Button
                              onClick={() => handleCallReference(reference)}
                              disabled={reference.callStatus === 'calling' || callInProgress}
                              variant={getCallButtonVariant(reference.callStatus)}
                              size="sm"
                            >
                              {getCallButtonText(reference.callStatus)}
                            </Button>
                            {reference.callStatus === 'completed' && reference.conversationId && (
                              <Button
                                onClick={() => handleViewTranscript(reference)}
                                variant="outline"
                                size="sm"
                              >
                                📄 View Transcript
                              </Button>
                            )}
                          </div>
                          {/* Automated notes summary */}
                          <div className="bg-white border border-dashed border-emerald-200 rounded-md px-3 py-2 text-gray-700 text-sm mt-2">
                            <span className="font-semibold text-emerald-600">Summary:</span> Positive feedback, recommended for rehire.
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {candidateReferences.length === 0 && (
                    <div className="text-gray-400 text-center py-6">No references added yet.</div>
                  )}
                </div>
              </div>
              {/* Notes Toggle */}
              <div>
                <button
                  className="text-emerald-600 font-semibold underline mb-2"
                  onClick={() => setShowNotes((v) => !v)}
                >
                  {showNotes ? 'Hide Main Notes' : 'Show Main Notes'}
                </button>
                {showNotes && (
                  <div className="bg-slate-50 rounded-xl p-4 text-gray-800 shadow-inner">
                    <p className="text-gray-500 italic">No notes available for this applicant yet.</p>
                  </div>
                )}
              </div>
              {/* Start Call Button */}
              <Button
                size="lg"
                className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-8 py-3 text-xl font-semibold mt-2"
              >
                Start Interview
              </Button>
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
