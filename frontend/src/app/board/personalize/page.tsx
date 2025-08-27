'use client'

import { useState } from 'react'
import { ChevronDown, Upload, FileJson, Github, Linkedin, FileText, AlertCircle, X, Check, Search, Plus } from 'lucide-react'
import { useApplicants } from '@/lib/contexts/ApplicantContext'

// Interview-specific preset templates
const interviewTemplates = [
  {
    title: "Technical Interview",
    prompt: `Analyze candidate responses for technical accuracy. Flag when:
- They claim experience with technologies not on their CV
- Years of experience don't match timeline
- Technical explanations seem superficial
- Project descriptions differ from LinkedIn/GitHub`
  },
  {
    title: "Behavioral Interview", 
    prompt: `Detect inconsistencies in behavioral responses. Check for:
- Timeline conflicts with CV
- Company/role mismatches
- Exaggerated achievements
- Missing details about claimed experiences`
  },
  {
    title: "Executive Interview",
    prompt: `Verify leadership claims and company metrics. Flag:
- Revenue/growth numbers that seem inflated
- Team sizes that don't match LinkedIn
- Strategic decisions timeline issues
- Missing evidence of claimed initiatives`
  }
];

export default function PersonalizePage() {
  const [allPresets, setAllPresets] = useState(interviewTemplates);
  const [selectedPreset, setSelectedPreset] = useState(interviewTemplates[0]);
  const [showPresets, setShowPresets] = useState(true);
  const [editorContent, setEditorContent] = useState(interviewTemplates[0].prompt);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<Record<string, unknown> | null>(null);
  const [showCandidateOverlay, setShowCandidateOverlay] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetPrompt, setNewPresetPrompt] = useState('');
  
  const { applicants, fetchApplicants } = useApplicants();

  const handlePresetClick = (preset: typeof interviewTemplates[0]) => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to switch?")) {
        return;
    }
    setSelectedPreset(preset);
    setEditorContent(preset.prompt);
    setIsDirty(false);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedPreset || saving || !isDirty) return;
    
    try {
      setSaving(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAllPresets(prev => 
        prev.map(p => 
          p.title === selectedPreset.title 
            ? { ...p, prompt: editorContent }
            : p
          )
        );
      setIsDirty(false);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save preset. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setCandidateProfile(json);
        alert(`Loaded profile for: ${json.firstName || json.name} ${json.lastName || ''}`);
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadFromDatabase = () => {
    fetchApplicants();
    setShowCandidateOverlay(true);
  };

  const handleSelectCandidate = (applicant: typeof applicants[0]) => {
    // Convert applicant data to profile format
    const profile = {
      name: applicant.name,
      email: applicant.email,
      role: applicant.cv_data?.jobTitle || applicant.li_data?.headline,
      ...applicant.cv_data,
      github: applicant.gh_data,
      linkedin: applicant.li_data
    };
    setCandidateProfile(profile);
    setShowCandidateOverlay(false);
    setCandidateSearchQuery('');
  };

  // Filter candidates based on search query
  const filteredCandidates = applicants.filter(applicant => {
    if (!candidateSearchQuery.trim()) return true;
    const query = candidateSearchQuery.toLowerCase();
    return (
      applicant.name.toLowerCase().includes(query) ||
      ((applicant.cv_data?.jobTitle && applicant.cv_data.jobTitle.toLowerCase().includes(query)) ||
       (applicant.li_data?.headline && applicant.li_data.headline.toLowerCase().includes(query))) ||
      (applicant.email && applicant.email.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading interview presets...</div>
      </div>
    );
  }

  return (
    <div className="select-none flex flex-col min-h-screen">
      {/* Header */}
      <nav className="relative">
        <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
          <h1 className="mb-4 text-base text-stone-500 font-normal">Personalize</h1>
          <div className="flex justify-between items-start">
            <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">Unmask Configuration</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPreset(true)}
                className="px-4 py-2 text-sm font-medium transition-all duration-200 border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Preset
              </button>
              <button
                onClick={handleLoadFromDatabase}
                className="px-4 py-2 text-sm font-medium transition-all duration-200 bg-stone-800 text-white hover:bg-stone-700 cursor-pointer flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Load Candidate Profile
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  !isDirty && !saving
                    ? 'bg-stone-300 text-stone-500 cursor-default'
                    : saving 
                      ? 'bg-stone-400 text-white cursor-not-allowed' 
                      : 'bg-stone-800 text-white hover:bg-stone-700'
                }`}
              >
                {!isDirty && !saving ? 'Saved' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow bg-wallpaper py-[3rem] px-[3rem]">
        {/* Candidate Profile Status */}
        {candidateProfile && (
          <div className="bg-white border border-stone-300 mb-6 px-6 py-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-5 w-5 text-stone-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">
                  Candidate Profile Loaded: {String(candidateProfile.firstName || candidateProfile.name || 'Unknown')} {String(candidateProfile.lastName || '')}
                </p>
                <p className="text-xs text-stone-600">
                  {Array.isArray(candidateProfile.professionalExperiences) ? candidateProfile.professionalExperiences.length : 0} experiences, 
                  {' '}{Array.isArray(candidateProfile.skills) ? candidateProfile.skills.length : 0} skills, 
                  {' '}{Array.isArray(candidateProfile.educations) ? candidateProfile.educations.length : 0} education entries
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                {Boolean(candidateProfile.github) && <Github className="h-4 w-4 text-stone-600" />}
                {Boolean(candidateProfile.linkedin) && <Linkedin className="h-4 w-4 text-stone-600" />}
                <FileText className="h-4 w-4 text-stone-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-stone-300 divide-y divide-stone-300">
          {/* Interview Presets Section */}
          <section className="py-[3rem] px-[3rem]">
            <div className="mb-[2rem]">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2 text-stone-600 hover:text-stone-800 text-sm font-medium transition-colors mb-4"
              >
                <ChevronDown 
                  className={`h-4 w-4 transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`}
                />
                {showPresets ? 'Hide Interview Presets' : 'Show Interview Presets'}
              </button>
              
              {showPresets && (
                <>
                  <h2 className="text-stone-800 font-medium text-lg mb-2">Interview Presets</h2>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Choose from predefined templates or customize your own detection rules for different interview types.
                  </p>
                </>
              )}
            </div>
            
            {showPresets && (
              <div className="grid grid-cols-3 gap-6">
                {allPresets.map((preset) => (
                  <div
                    key={preset.title}
                    onClick={() => handlePresetClick(preset)}
                    className={`
                      p-6 cursor-pointer transition-all duration-200 bg-white
                      h-48 flex flex-col border
                      ${selectedPreset?.title === preset.title
                        ? 'border-stone-900 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300'
                      }
                    `}
                  >
                    <h3 className="font-medium text-stone-900 mb-3 text-center text-sm">
                      {preset.title}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed flex-1 overflow-hidden">
                      {preset.prompt.substring(0, 150) + (preset.prompt.length > 150 ? '...' : '')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Detection Rules Editor Section */}
          <section className="py-[3rem] px-[3rem]">
            <div className="mb-[2rem]">
              <h2 className="text-stone-800 font-medium text-lg mb-2">Detection Rules</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                Define how Unmask should analyze candidate responses and flag inconsistencies with their profile data.
              </p>
            </div>
            
            <textarea
              value={editorContent}
              onChange={handleEditorChange}
              className="w-full h-64 text-sm text-stone-900 border border-stone-200 p-4 resize-none focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-transparent bg-white font-mono leading-relaxed"
              placeholder="Configure detection rules..."
            />
          </section>
        </div>

        {/* Footer */}
        <div className="mt-6 px-6 py-4 bg-stone-50 border border-stone-300">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-stone-800 flex items-center gap-1">
                <FileJson className="h-3 w-3" />
                Sample Profile Format
              </a>
              <a href="#" className="hover:text-stone-800 flex items-center gap-1">
                <Github className="h-3 w-3" />
                Integration Guide
              </a>
            </div>
            <div>
              <a href="#" className="hover:text-stone-800">Download Unmask</a>
            </div>
          </div>
        </div>
      </div>

      {/* Add Preset Dialog */}
      {showAddPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white border border-stone-300 w-full max-w-lg">
            <div className="px-6 py-4 border-b border-stone-300 flex items-center justify-between">
              <h2 className="text-lg font-medium text-stone-900">Add New Preset</h2>
              <button
                onClick={() => {
                  setShowAddPreset(false);
                  setNewPresetTitle('');
                  setNewPresetPrompt('');
                }}
                className="p-2 hover:bg-stone-100 transition-colors"
              >
                <X className="h-4 w-4 text-stone-600" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Preset Name</label>
                <input
                  type="text"
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  placeholder="e.g., Sales Interview"
                  className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Detection Rules</label>
                <textarea
                  value={newPresetPrompt}
                  onChange={(e) => setNewPresetPrompt(e.target.value)}
                  placeholder="Enter the detection rules for this preset..."
                  className="w-full h-32 px-3 py-2 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-300 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddPreset(false);
                  setNewPresetTitle('');
                  setNewPresetPrompt('');
                }}
                className="px-4 py-2 text-sm border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newPresetTitle.trim() && newPresetPrompt.trim()) {
                    const newPreset = {
                      title: newPresetTitle.trim(),
                      prompt: newPresetPrompt.trim()
                    };
                    setAllPresets(prev => [...prev, newPreset]);
                    setSelectedPreset(newPreset);
                    setEditorContent(newPreset.prompt);
                    setShowAddPreset(false);
                    setNewPresetTitle('');
                    setNewPresetPrompt('');
                    setIsDirty(false);
                  }
                }}
                disabled={!newPresetTitle.trim() || !newPresetPrompt.trim()}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  newPresetTitle.trim() && newPresetPrompt.trim()
                    ? 'bg-stone-800 text-white hover:bg-stone-700'
                    : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                }`}
              >
                Create Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Overlay for Candidate Selection */}
      {showCandidateOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div 
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-200 border-opacity-30 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Select Candidate Profile</h2>
              <button
                onClick={() => {
                  setShowCandidateOverlay(false);
                  setCandidateSearchQuery('');
                }}
                className="p-2 hover:bg-stone-100 hover:bg-opacity-30 transition-all duration-200"
              >
                <X className="h-5 w-5 text-stone-600" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-stone-200 border-opacity-30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search candidates by name, role, or email..."
                  value={candidateSearchQuery}
                  onChange={(e) => setCandidateSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-50 border border-stone-200 border-opacity-50 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-opacity-50 focus:border-transparent placeholder-stone-400 text-stone-900"
                  autoFocus
                />
                {candidateSearchQuery && (
                  <button
                    onClick={() => setCandidateSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Candidate List */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
              {applicants.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-stone-500">No candidates found in the database.</p>
                  <p className="text-sm text-stone-400 mt-2">Add candidates from the Applicants page first.</p>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-stone-500">No candidates match your search.</p>
                  <p className="text-sm text-stone-400 mt-2">Try a different search term.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm text-stone-500 mb-2">
                    {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} found
                  </p>
                  {filteredCandidates.map((applicant) => (
                    <button
                      key={applicant.id}
                      onClick={() => handleSelectCandidate(applicant)}
                      className="w-full bg-white bg-opacity-40 hover:bg-opacity-60 backdrop-blur-sm border border-stone-200 border-opacity-50 hover:border-stone-400 p-4 transition-all duration-200 text-left group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-stone-100 flex items-center justify-center">
                            <span className="text-lg font-medium text-stone-700">
                              {applicant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-stone-900">{applicant.name}</h3>
                            <p className="text-sm text-stone-500">
                              {applicant.cv_data?.jobTitle || applicant.li_data?.headline || 'No role specified'}
                            </p>
                            {applicant.email && (
                              <p className="text-xs text-stone-400 mt-1">{applicant.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {applicant.cv_data && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1">CV</span>
                          )}
                          {applicant.li_data && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1">LinkedIn</span>
                          )}
                          {applicant.gh_data && (
                            <span className="text-xs bg-stone-100 text-stone-700 px-2 py-1">GitHub</span>
                          )}
                          <div className="w-8 h-8 bg-stone-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <Check className="h-4 w-4 text-stone-600" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Alternative file upload */}
            <div className="px-6 py-4 border-t border-stone-200 border-opacity-30 bg-stone-50 bg-opacity-20">
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-600">Or upload from file:</p>
                <label className="px-3 py-1.5 text-xs font-medium bg-stone-600 bg-opacity-80 text-white hover:bg-opacity-100 cursor-pointer flex items-center gap-2 transition-all duration-200">
                  <FileJson className="h-3 w-3" />
                  Upload JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}