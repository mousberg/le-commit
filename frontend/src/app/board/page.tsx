'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Trash2, MoreVertical, Trash, Download, Share2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import TranscriptModal from '../../components/TranscriptModal';
import ProcessingLoader from '../../components/ProcessingLoader';
import CredibilityScore from '../../components/credibility-score';
import { useApplicants } from '../../lib/contexts/ApplicantContext';
import NewApplicantForm from './components/NewApplicantForm';
import { CvData, Experience, Education } from '../../lib/interfaces/cv';
import { GitHubData } from '../../lib/interfaces/github';

// Data Comparison Component
function DataComparisonSection({ cvData, linkedinData }: { cvData?: CvData; linkedinData?: CvData }) {
  if (!cvData || !linkedinData) return null;

  const compareExperiences = () => {
    const cvExperiences = cvData.professionalExperiences || [];
    const linkedinExperiences = linkedinData.professionalExperiences || [];
    
    const matches: Array<{cvExp: Experience; linkedinExp: Experience; titleMatch: boolean; type: string}> = [];
    const mismatches: Array<{data: Experience; source: string; missing: string; type: string}> = [];

    cvExperiences.forEach(cvExp => {
      const linkedinMatch = linkedinExperiences.find(lExp => 
        lExp.companyName?.toLowerCase().includes(cvExp.companyName?.toLowerCase() || '') ||
        cvExp.companyName?.toLowerCase().includes(lExp.companyName?.toLowerCase() || '')
      );
      
      if (linkedinMatch) {
        const titleMatch = cvExp.title?.toLowerCase() === linkedinMatch.title?.toLowerCase();
        matches.push({
          cvExp,
          linkedinExp: linkedinMatch,
          titleMatch,
          type: 'experience'
        });
      } else {
        mismatches.push({
          data: cvExp,
          source: 'CV',
          missing: 'LinkedIn',
          type: 'experience'
        });
      }
    });

    return { matches, mismatches };
  };

  const compareSkills = () => {
    const cvSkills = (cvData.skills || []).map(s => s.toLowerCase());
    const linkedinSkills = (linkedinData.skills || []).map(s => s.toLowerCase());
    
    const commonSkills = cvSkills.filter(skill => linkedinSkills.includes(skill));
    const cvOnlySkills = cvSkills.filter(skill => !linkedinSkills.includes(skill));
    const linkedinOnlySkills = linkedinSkills.filter(skill => !cvSkills.includes(skill));

    return { commonSkills, cvOnlySkills, linkedinOnlySkills };
  };

  const { matches, mismatches } = compareExperiences();
  const { cvOnlySkills, linkedinOnlySkills } = compareSkills();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
        <span className="text-xl">🔍</span>
        CV vs LinkedIn Comparison
      </h3>
      
      {/* Quick Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
          <div>
            <div className="text-sm text-green-600 font-medium">Companies Verified</div>
            <div className="text-xs text-green-600">{matches.length} of {(cvData.professionalExperiences || []).length} CV companies found on LinkedIn</div>
          </div>
          <div className="text-2xl font-semibold text-green-700">{matches.length}</div>
        </div>
        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div>
            <div className="text-sm text-yellow-700 font-medium">Skills to Verify</div>
            <div className="text-xs text-yellow-600">{cvOnlySkills.length} CV skills + {linkedinOnlySkills.length} LinkedIn skills missing from other</div>
          </div>
          <div className="text-2xl font-semibold text-yellow-700">{cvOnlySkills.length + linkedinOnlySkills.length}</div>
        </div>
      </div>

      {/* Key Findings */}
      {(matches.length > 0 || mismatches.length > 0 || cvOnlySkills.length > 0 || linkedinOnlySkills.length > 0) && (
        <div className="space-y-3">
          {/* Verified Companies */}
          {matches.length > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm text-green-700">Verified: {matches.map(m => m.cvExp.companyName).join(', ')}</span>
              </div>
              <div className="text-xs text-green-600">
                {matches.filter(m => m.titleMatch).length} exact title matches, {matches.filter(m => !m.titleMatch).length} title differences
              </div>
            </div>
          )}

          {/* Missing Companies */}
          {mismatches.length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-sm text-yellow-700">CV Only: {mismatches.map(m => m.data.companyName).join(', ')}</span>
              </div>
              <div className="text-xs text-yellow-600">Ask why these companies aren&apos;t on LinkedIn</div>
            </div>
          )}

          {/* Skill Differences */}
          {(cvOnlySkills.length > 0 || linkedinOnlySkills.length > 0) && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-medium text-sm text-blue-700 mb-1">Skill Gaps</div>
              <div className="text-xs text-blue-600 space-y-1">
                {cvOnlySkills.length > 0 && (
                  <div><span className="font-medium">CV only ({cvOnlySkills.length}):</span> {cvOnlySkills.slice(0, 5).join(', ')}{cvOnlySkills.length > 5 ? '...' : ''}</div>
                )}
                {linkedinOnlySkills.length > 0 && (
                  <div><span className="font-medium">LinkedIn only ({linkedinOnlySkills.length}):</span> {linkedinOnlySkills.slice(0, 5).join(', ')}{linkedinOnlySkills.length > 5 ? '...' : ''}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// LinkedIn Section Component
function LinkedInSection({ linkedinData }: { linkedinData: CvData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="h-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💼</span>
          <h3 className="text-lg font-semibold text-gray-900">LinkedIn Data</h3>
        </div>
        <span className="ml-2 text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {linkedinData.professionalSummary && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>📝</span>
                  Professional Summary
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">{linkedinData.professionalSummary}</p>
              </div>
            )}

            {linkedinData.jobTitle && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>👔</span>
                  Current Role
                </h4>
                <p className="text-gray-700 text-sm font-medium">{linkedinData.jobTitle}</p>
              </div>
            )}

            {linkedinData.professionalExperiences && linkedinData.professionalExperiences.length > 0 && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🏢</span>
                  LinkedIn Experience
                  <span className="text-xs text-gray-500">({linkedinData.professionalExperiences.length} roles)</span>
                </h4>
                <div className="space-y-3">
                  {linkedinData.professionalExperiences.slice(0, 3).map((exp, i) => (
                    <div key={i} className="text-sm border-l-2 border-cyan-300 pl-3">
                      <div className="font-semibold text-gray-900">{exp.title}</div>
                      <div className="text-cyan-700 font-medium">{exp.companyName}</div>
                      <div className="text-gray-600 text-xs">
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

            {linkedinData.skills && linkedinData.skills.length > 0 && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🛠️</span>
                  LinkedIn Skills
                  <span className="text-xs text-gray-500">({linkedinData.skills.length} total)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {linkedinData.skills.slice(0, 10).map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                  {linkedinData.skills.length > 10 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      +{linkedinData.skills.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {linkedinData.educations && linkedinData.educations.length > 0 && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🎓</span>
                  LinkedIn Education
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {linkedinData.educations.slice(0, 2).map((edu, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-semibold text-gray-900">{edu.degree}</div>
                      <div className="text-cyan-700">{edu.institution}</div>
                      <div className="text-gray-600 text-xs">
                        {edu.startYear} - {edu.ongoing ? 'Present' : (edu.endYear || '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// GitHub Section Component
function GitHubSection({ githubData }: { githubData: GitHubData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="h-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐙</span>
          <h3 className="text-lg font-semibold text-gray-900">GitHub Data</h3>
          <a
            href={githubData.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            @{githubData.username} ↗
          </a>
        </div>
        <span className="ml-2 text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>📊</span>
                Activity Overview
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">📦 Public Repos:</span>
                  <span className="font-medium">{githubData.publicRepos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">👥 Followers:</span>
                  <span className="font-medium">{githubData.followers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">⭐ Total Stars:</span>
                  <span className="font-medium">{githubData.starredRepos}</span>
                </div>
                {githubData.contributions && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">🔥 Streak:</span>
                    <span className="font-medium">{githubData.contributions.streakDays} days</span>
                  </div>
                )}
              </div>
            </div>

            {githubData.languages && githubData.languages.length > 0 && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💻</span>
                  Top Languages
                </h4>
                <div className="space-y-2">
                  {githubData.languages.slice(0, 5).map((lang, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 font-medium">{lang.language}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${lang.percentage}%` }}
                          />
                        </div>
                        <span className="text-gray-500 text-xs">{lang.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {githubData.repositories && githubData.repositories.length > 0 && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📂</span>
                  Notable Repositories
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {githubData.repositories
                    .filter(repo => !repo.isFork && repo.stars > 0)
                    .slice(0, 4)
                    .map((repo, i) => (
                      <div key={i} className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-sm text-gray-900">{repo.name}</span>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">⭐ {repo.stars}</span>
                            <span className="flex items-center gap-1">🍴 {repo.forks}</span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{repo.description}</p>
                        )}
                        {repo.language && (
                          <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                            {repo.language}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {githubData.overallQualityScore && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🏆</span>
                  Code Quality Metrics
                </h4>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Overall Quality Score</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {githubData.overallQualityScore.overall}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">📖 README:</span>
                      <span className="font-medium">{githubData.overallQualityScore.readme}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">🔄 CI/CD:</span>
                      <span className="font-medium">{githubData.overallQualityScore.cicd}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">📚 Docs:</span>
                      <span className="font-medium">{githubData.overallQualityScore.documentation}/100</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  summary?: string; // AI-generated summary from transcript analysis
}

interface ReferenceFormData {
  name: string;
  phoneNumber: string;
  companyName: string;
  roleTitle: string;
  workDuration: string;
}

function CollapsibleCVSection({ cvData }: { cvData: CvData }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="h-full">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <h3 className="text-lg font-semibold text-gray-900">CV Data</h3>
        </div>
        <span className="ml-2 text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="p-4 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cvData.professionalSummary && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>💼</span>
                  Professional Summary
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">{cvData.professionalSummary}</p>
              </div>
            )}
            {cvData.skills && cvData.skills.length > 0 && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🛠️</span>
                  Skills
                  <span className="text-xs text-gray-500">({cvData.skills.length} total)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {cvData.skills.slice(0, 12).map((skill: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                  {cvData.skills.length > 12 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      +{cvData.skills.length - 12} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {cvData.professionalExperiences && cvData.professionalExperiences.length > 0 && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🏢</span>
                  Experience
                  <span className="text-xs text-gray-500">({cvData.professionalExperiences.length} roles)</span>
                </h4>
                <div className="space-y-3">
                  {cvData.professionalExperiences.slice(0, 3).map((exp: Experience, i: number) => (
                    <div key={i} className="text-sm border-l-2 border-blue-300 pl-3">
                      <div className="font-semibold text-gray-900">{exp.title}</div>
                      <div className="text-blue-700 font-medium">{exp.companyName}</div>
                      <div className="text-gray-600 text-xs">
                        {exp.startMonth ? `${exp.startMonth}/` : ''}{exp.startYear} - {
                          exp.ongoing ? 'Present' :
                          (exp.endMonth ? `${exp.endMonth}/` : '') + (exp.endYear || '')
                        }
                      </div>
                    </div>
                  ))}
                  {cvData.professionalExperiences.length > 3 && (
                    <div className="text-xs text-gray-500 italic">
                      +{cvData.professionalExperiences.length - 3} more positions...
                    </div>
                  )}
                </div>
              </div>
            )}
            {cvData.educations && cvData.educations.length > 0 && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🎓</span>
                  Education
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cvData.educations.slice(0, 2).map((edu: Education, i: number) => (
                    <div key={i} className="text-sm">
                      <div className="font-semibold text-gray-900">{edu.degree}</div>
                      <div className="text-blue-700">{edu.institution}</div>
                      <div className="text-gray-600 text-xs">
                        {edu.startYear} - {edu.ongoing ? 'Present' : (edu.endYear || '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BoardPageContent() {
  const {
    applicants,
    fetchApplicants,
    refreshApplicant,
    deleteApplicant
  } = useApplicants();

  const searchParams = useSearchParams();
  const router = useRouter();

  // NEW URL LOGIC: /board = new form, /board?id=<id> = view applicant
  const urlId = searchParams.get('id');
  const isNewForm = !urlId; // If no id parameter, show new form
  const selectedId = urlId; // The actual applicant ID (or null for new form)

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

  // Auto-refresh processing applicants
  useEffect(() => {
    const interval = setInterval(() => {
      applicants.forEach(applicant => {
        if (applicant.status === 'processing' || applicant.status === 'uploading' || applicant.status === 'analyzing') {
          refreshApplicant(applicant.id);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [applicants, refreshApplicant]);

  // Handle successful applicant creation from NewApplicantForm
  const handleApplicantCreated = useCallback((applicantId: string) => {
    // The NewApplicantForm component handles navigation, but we can add
    // additional logic here if needed (e.g., analytics, notifications)
    console.log('Applicant created:', applicantId);
  }, []);

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

    // If we just deleted the currently selected applicant, navigate appropriately
    if (selectedId === applicantId) {
      if (applicants.length > 1) {
        // Navigate to the first remaining applicant (that's not the one we just deleted)
        const remainingApplicant = applicants.find(a => a.id !== applicantId);
        if (remainingApplicant) {
          navigateToApplicant(remainingApplicant.id);
        } else {
          navigateToNew();
        }
      } else {
        navigateToNew();
      }
    }

    setDeleteConfirmModal({ isOpen: false, applicantId: '', applicantName: '' });
  };

  const cancelDeleteApplicant = () => {
    setDeleteConfirmModal({ isOpen: false, applicantId: '', applicantName: '' });
  };

  const selectedCandidate = isNewForm ? null : applicants.find(a => a.id === selectedId);

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

  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    applicantId: '',
    applicantName: ''
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
      // Automatically open the newly created reference card
      setOpenReferenceId(reference.id);
    }
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
      <div className="min-h-screen bg-white">
        {/* Main Content */}
        <main className="p-10">
        {isNewForm ? (
            <NewApplicantForm onSuccess={handleApplicantCreated} />
          ) : selectedCandidate ? (
            // Show processing loader for uploading/processing/analyzing states
            selectedCandidate.status === 'uploading' || selectedCandidate.status === 'processing' || selectedCandidate.status === 'analyzing' ? (
              <ProcessingLoader
                status={selectedCandidate.status}
                fileName={selectedCandidate.originalFileName}
                applicant={selectedCandidate}
              />
            ) : (
            <div className="max-w-4xl mx-auto">
              {/* Compact Header */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-semibold text-gray-900">{selectedCandidate.name}</h2>
                      <div className="flex items-center gap-2">
                        {selectedCandidate.cvData && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200 font-medium">
                            CV ✓
                          </span>
                        )}
                        {selectedCandidate.linkedinData && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200 font-medium">
                            LinkedIn ✓
                          </span>
                        )}
                        {selectedCandidate.githubData && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-200 font-medium">
                            GitHub ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600">{selectedCandidate.role || 'Position not specified'}</p>
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
              {selectedCandidate.analysisResult && (
                <div className="mb-6">
                  <CredibilityScore analysisResult={selectedCandidate.analysisResult} />
                </div>
              )}

              {/* CV vs LinkedIn Comparison */}
              <DataComparisonSection 
                cvData={selectedCandidate.cvData} 
                linkedinData={selectedCandidate.linkedinData} 
              />

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* CV Section */}
                {selectedCandidate.cvData && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <CollapsibleCVSection cvData={selectedCandidate.cvData} />
                  </div>
                )}

                {/* LinkedIn Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  {selectedCandidate.linkedinData ? (
                    <LinkedInSection linkedinData={selectedCandidate.linkedinData} />
                  ) : (
                    <div className="p-6 opacity-60">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl opacity-50">💼</span>
                        <h3 className="text-lg font-semibold text-gray-500">LinkedIn</h3>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Not Available</span>
                      </div>
                      <p className="text-gray-500 text-sm">LinkedIn data not provided for this candidate.</p>
                    </div>
                  )}
                </div>

                {/* GitHub Section - Full Width if available */}
                {(selectedCandidate.githubData || !selectedCandidate.cvData) && (
                  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${selectedCandidate.githubData ? 'lg:col-span-2' : ''}`}>
                    {selectedCandidate.githubData ? (
                      <GitHubSection githubData={selectedCandidate.githubData} />
                    ) : (
                      <div className="p-6 opacity-60">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl opacity-50">🐙</span>
                          <h3 className="text-lg font-semibold text-gray-500">GitHub</h3>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Not Available</span>
                        </div>
                        <p className="text-gray-500 text-sm">GitHub data not provided for this candidate.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Processing status message */}
              {selectedCandidate.status === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">
                    Processing failed. Please try uploading again.
                  </p>
                </div>
              )}

              {/* Reference Calls & Start Interview */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Reference Calls</h3>
                  <Button size="sm" onClick={handleStartAddReference} className="bg-purple-600 hover:bg-purple-700 text-white" disabled={addingReference}>+ Add Reference</Button>
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
                              className={reference.callStatus === 'idle' || !reference.callStatus ?
                                'bg-emerald-500 hover:bg-emerald-600 text-white font-semibold' :
                                ''}
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
                          {/* AI-generated summary - only show after call completion */}
                          {reference.callStatus === 'completed' && reference.summary && (
                            <div className="bg-white border border-dashed border-emerald-200 rounded-md px-3 py-2 text-gray-700 text-sm mt-2">
                              <span className="font-semibold text-emerald-600">Summary:</span> {reference.summary}
                            </div>
                          )}
                          {reference.callStatus === 'completed' && !reference.summary && (
                            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-md px-3 py-2 text-gray-500 text-sm mt-2">
                              <span className="font-medium">Summary:</span> Processing transcript for analysis...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {candidateReferences.length === 0 && (
                    <div className="text-gray-400 text-center py-6">No references added yet.</div>
                  )}
                </div>
                
                {/* Start Interview Button */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Button
                    size="lg"
                    className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 text-lg font-medium shadow-sm transition-all duration-200"
                  >
                    Start Interview
                  </Button>
                </div>
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
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
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
