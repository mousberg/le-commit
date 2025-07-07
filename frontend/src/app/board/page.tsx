'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import TranscriptModal from '../../components/TranscriptModal';

const mockCandidates = [
  {
    id: 1,
    name: 'Alice Johnson',
    role: 'Frontend Developer',
    score: 92,
    links: {
      cv: '#',
      linkedin: '#',
      github: '#',
    },
    flags: [
      { type: 'positive', label: 'Strong React skills' },
      { type: 'caution', label: 'Limited backend experience' },
    ],
    questions: [
      'How do you manage state in React?',
      'Describe a time you improved UI performance.',
    ],
    references: [
      { name: 'Jane Smith', phone: '+1 (555) 123-4567' },
      { name: 'Bob Lee', phone: '+1 (555) 987-6543' },
    ],
    notes: 'Great communicator. Needs more backend exposure.',
  },
  {
    id: 2,
    name: 'Bob Lee',
    role: 'Backend Engineer',
    score: 85,
    links: {
      cv: '#',
      linkedin: '#',
      github: '#',
    },
    flags: [
      { type: 'positive', label: 'Excellent Node.js' },
      { type: 'verify', label: 'Reference check needed' },
    ],
    questions: [
      'How do you optimize database queries?',
      'Explain your experience with microservices.',
    ],
    references: [
      { name: 'Alice Johnson', phone: '+1 (555) 222-3333' },
    ],
    notes: 'Solid backend, check teamwork skills.',
  },
];

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

export default function BoardPage() {
  const [selectedId, setSelectedId] = useState<number | 'new'>(mockCandidates[0].id);
  const [showNotes, setShowNotes] = useState(false);
  // Dynamic references for the selected candidate
  // const [dynamicReferences, setDynamicReferences] = useState([
  //   { name: 'Jane Smith', phone: '+1 (555) 123-4567', notes: '', flags: mockReferenceFlags[0], questions: mockReferenceQuestions[0] },
  //   { name: 'Bob Lee', phone: '+1 (555) 987-6543', notes: '', flags: mockReferenceFlags[1], questions: mockReferenceQuestions[1] },
  // ]);

  // Upload refs for new candidate
  // const [cv, setCV] = useState<File | null>(null);
  // const [linkedin, setLinkedin] = useState<File | null>(null);
  // const [github, setGithub] = useState<File | null>(null);

  // Simulate adding a new candidate
  const handleCreateCandidate = () => {
    // In a real app, process uploads and add to list
    setSelectedId(mockCandidates[0].id); // Go back to first candidate for now
  };

  const selectedCandidate =
    selectedId === 'new' ? null : mockCandidates.find(c => c.id === selectedId);

  const [referencesByCandidate, setReferencesByCandidate] = useState<{ [id: number]: Reference[] }>({});
  const [addingReference, setAddingReference] = useState(false);
  const [newReferenceForm, setNewReferenceForm] = useState<ReferenceFormData>({
    name: '', phoneNumber: '', companyName: '', roleTitle: '', workDuration: ''
  });
  const [openReferenceId, setOpenReferenceId] = useState<string | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [transcriptModal, setTranscriptModal] = useState<{
    isOpen: boolean;
    conversationId: string;
    referenceName: string;
  }>({ isOpen: false, conversationId: '', referenceName: '' });

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Header */}
      <header className="w-full h-16 flex items-center px-8 bg-white shadow-sm border-b border-gray-100 text-2xl font-bold tracking-tight text-gray-900">
        ShadowCheck Board
      </header>
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-100 flex flex-col py-6 px-4 gap-4">
          <div className="mb-4">
            <div className="text-lg font-semibold mb-2">Candidates</div>
            <ul className="space-y-1">
              {mockCandidates.map(c => (
                <li key={c.id}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${selectedId === c.id ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-gray-800'}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Button
            onClick={() => setSelectedId('new')}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-semibold shadow-sm"
          >
            + Add New Candidate
          </Button>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-10">
          {selectedId === 'new' ? (
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col gap-8">
              <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">Add New Candidate</h2>
              <div className="flex flex-col gap-6">
                {/* CV Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-gray-800 mb-1">Upload CV</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
                {/* LinkedIn Profile Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-gray-800 mb-1">Upload LinkedIn Profile</label>
                  <input
                    type="file"
                    accept=".pdf,.html,.txt"
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
                {/* GitHub Profile Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-gray-800 mb-1">Upload GitHub Profile</label>
                  <input
                    type="file"
                    accept=".pdf,.html,.txt"
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateCandidate}
                size="lg"
                className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-8 py-3 text-xl font-semibold mt-4"
              >
                Analyse Profile
              </Button>
            </div>
          ) : selectedCandidate ? (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col gap-8">
              {/* Candidate Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-1">{selectedCandidate.name}</h2>
                  <p className="text-lg text-gray-600">{selectedCandidate.role}</p>
                </div>
                <div className="flex flex-col md:items-end gap-2">
                  <div className="flex gap-4">
                    <a href={selectedCandidate.links.cv} className="text-emerald-600 hover:text-emerald-800 underline">CV</a>
                    <a href={selectedCandidate.links.linkedin} className="text-blue-600 hover:text-blue-800 underline">LinkedIn</a>
                    <a href={selectedCandidate.links.github} className="text-gray-800 hover:text-gray-600 underline">GitHub</a>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">{selectedCandidate.score}%</div>
                </div>
              </div>
              {/* Flags */}
              <div className="flex flex-wrap gap-3">
                {selectedCandidate.flags.map((flag, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      flag.type === 'positive'
                        ? 'bg-emerald-100 text-emerald-700'
                        : flag.type === 'caution'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {flag.label}
                  </span>
                ))}
              </div>
              {/* Questions to Ask */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Questions to Ask</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {selectedCandidate.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
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
                {/* Transcript Modal */}
                <TranscriptModal
                  isOpen={transcriptModal.isOpen}
                  onClose={closeTranscriptModal}
                  conversationId={transcriptModal.conversationId}
                  referenceName={transcriptModal.referenceName}
                />
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
                    {selectedCandidate.notes}
                  </div>
                )}
              </div>
              {/* Start Call Button */}
              <Button
                size="lg"
                className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-8 py-3 text-xl font-semibold mt-2"
              >
                Start Interview
              </Button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
} 