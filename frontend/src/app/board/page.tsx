'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';

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

const mockReferenceFlags = [
  [{ type: 'positive', label: 'Responsive' }],
  [{ type: 'caution', label: 'Needs follow-up' }],
  [{ type: 'verify', label: 'Unverified' }],
];
const mockReferenceQuestions = [
  ['How was their teamwork?', 'Would you rehire?'],
  ['How did they handle deadlines?'],
  ['Any concerns to share?'],
];

export default function BoardPage() {
  const [selectedId, setSelectedId] = useState<number | 'new'>(mockCandidates[0].id);
  const [showNotes, setShowNotes] = useState(false);
  // Dynamic references for the selected candidate
  const [dynamicReferences, setDynamicReferences] = useState([
    { name: 'Jane Smith', phone: '+1 (555) 123-4567', notes: '', flags: mockReferenceFlags[0], questions: mockReferenceQuestions[0] },
    { name: 'Bob Lee', phone: '+1 (555) 987-6543', notes: '', flags: mockReferenceFlags[1], questions: mockReferenceQuestions[1] },
  ]);

  // Upload refs for new candidate
  // const [cv, setCV] = useState<File | null>(null);
  // const [linkedin, setLinkedin] = useState<File | null>(null);
  // const [github, setGithub] = useState<File | null>(null);

  // Simulate adding a new candidate
  const handleCreateCandidate = () => {
    // In a real app, process uploads and add to list
    setSelectedId(mockCandidates[0].id); // Go back to first candidate for now
  };

  const handleAddReference = () => {
    setDynamicReferences([
      ...dynamicReferences,
      { name: '', phone: '', notes: '', flags: mockReferenceFlags[2], questions: mockReferenceQuestions[2] },
    ]);
  };

  const handleReferenceChange = (idx: number, field: string, value: string) => {
    setDynamicReferences(refs => refs.map((ref, i) => i === idx ? { ...ref, [field]: value } : ref));
  };

  const selectedCandidate =
    selectedId === 'new' ? null : mockCandidates.find(c => c.id === selectedId);

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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reference Calls</h3>
                <ul className="text-gray-700 space-y-6">
                  {dynamicReferences.map((ref, i) => (
                    <li key={i} className="flex flex-col gap-2 bg-slate-50 rounded-xl p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                        <input
                          type="text"
                          value={ref.name}
                          onChange={e => handleReferenceChange(i, 'name', e.target.value)}
                          placeholder="Referee Name"
                          className="border rounded-md px-3 py-1 text-gray-800 w-full md:w-1/2"
                        />
                        <input
                          type="text"
                          value={ref.phone}
                          onChange={e => handleReferenceChange(i, 'phone', e.target.value)}
                          placeholder="Phone Number"
                          className="border rounded-md px-3 py-1 text-gray-800 w-full md:w-1/2"
                        />
                      </div>
                      {/* Reference Notes (auto-generated, read-only) */}
                      <div className="bg-white border border-dashed border-emerald-200 rounded-md px-3 py-2 text-gray-700 text-sm mt-2">
                        <span className="font-semibold text-emerald-600">Summary:</span> Positive feedback, recommended for rehire.
                      </div>
                      {/* Reference Flags */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ref.flags.map((flag, j) => (
                          <span
                            key={j}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                      {/* Reference Questions */}
                      <div className="mt-2">
                        <div className="font-semibold text-sm text-gray-700 mb-1">Questions to Validate:</div>
                        <ul className="list-disc list-inside text-gray-600 text-sm">
                          {ref.questions.map((q, k) => (
                            <li key={k}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleAddReference}
                  size="sm"
                  className="mt-4 rounded-lg bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-semibold shadow-sm"
                >
                  + Add Reference
                </Button>
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