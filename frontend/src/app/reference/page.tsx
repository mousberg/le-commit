'use client';

import { useState } from 'react';
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useRouter } from "next/navigation";
import TranscriptModal from "../../components/TranscriptModal";

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

interface CallResponse {
  success: boolean;
  conversationId?: string;
  callSid?: string;
  message?: string;
  error?: string;
}

interface ReferenceFormData {
  name: string;
  phoneNumber: string;
  companyName: string;
  roleTitle: string;
  workDuration: string;
}

export default function ReferencePage() {
  const router = useRouter();
  const [references, setReferences] = useState<Reference[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [transcriptModal, setTranscriptModal] = useState<{
    isOpen: boolean;
    conversationId: string;
    referenceName: string;
  }>({
    isOpen: false,
    conversationId: '',
    referenceName: ''
  });
  const [formData, setFormData] = useState<ReferenceFormData>({
    name: '',
    phoneNumber: '',
    companyName: '',
    roleTitle: '',
    workDuration: ''
  });

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleInputChange = (field: keyof ReferenceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddReference = () => {
    if (formData.name.trim() && formData.phoneNumber.trim()) {
      const reference: Reference = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        companyName: formData.companyName.trim(),
        roleTitle: formData.roleTitle.trim(),
        workDuration: formData.workDuration.trim(),
        dateAdded: new Date().toLocaleDateString(),
        callStatus: 'idle'
      };
      
      setReferences(prev => [...prev, reference]);
      setFormData({
        name: '',
        phoneNumber: '',
        companyName: '',
        roleTitle: '',
        workDuration: ''
      });
      setShowForm(false);
    }
  };

  const handleCancelForm = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      companyName: '',
      roleTitle: '',
      workDuration: ''
    });
    setShowForm(false);
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
    setTranscriptModal({
      isOpen: false,
      conversationId: '',
      referenceName: ''
    });
  };

  const handleCallReference = async (reference: Reference) => {
    if (callInProgress) {
      alert('A call is already in progress. Please wait for it to complete.');
      return;
    }

    setCallInProgress(true);
    
    // Update reference status to calling
    setReferences(prev => 
      prev.map(ref => 
        ref.id === reference.id 
          ? { ...ref, callStatus: 'calling' as const }
          : ref
      )
    );

    try {
      const response = await fetch('/api/reference-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: reference.phoneNumber,
          candidateName: 'John Doe', // This would come from context in real app
          referenceName: reference.name,
          companyName: reference.companyName || 'Previous Company',
          roleTitle: reference.roleTitle || 'Senior Software Engineer',
          workDuration: reference.workDuration || '2 years'
        }),
      });

      const data: CallResponse = await response.json();

      if (data.success) {
        // Update reference status to completed
        setReferences(prev => 
          prev.map(ref => 
            ref.id === reference.id 
              ? { ...ref, callStatus: 'completed' as const, conversationId: data.conversationId }
              : ref
          )
        );
        alert(`Call initiated successfully! Conversation ID: ${data.conversationId}`);
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error calling reference:', error);
      
      // Update reference status to failed
      setReferences(prev => 
        prev.map(ref => 
          ref.id === reference.id 
            ? { ...ref, callStatus: 'failed' as const }
            : ref
        )
      );
      
      alert(`Failed to initiate call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCallInProgress(false);
    }
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
    <main className="flex flex-col items-center w-full min-h-screen pt-32 pb-12 px-4 bg-gradient-to-b from-white via-slate-50 to-white">
      <section className="w-full max-w-4xl mx-auto">
        {/* Header with candidate name and back button */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {/* Left side - Candidate name */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">John Doe</h1>
              <p className="text-lg text-gray-600">Senior Software Engineer</p>
            </div>
            
            {/* Right side - Back button */}
            <div>
              <Button 
                onClick={handleBackToDashboard}
                variant="outline" 
                size="lg" 
                className="rounded-2xl shadow-sm px-6 py-2 text-base font-semibold"
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>
          
          {/* Action Buttons - Bottom Right */}
          <div className="flex justify-end mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline"
                size="sm"
                className="px-4 py-2 text-sm"
                onClick={() => alert('Import functionality coming soon!')}
              >
                📄 Import References
              </Button>
              <Button 
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm"
                onClick={() => setShowForm(!showForm)}
              >
                ➕ Create Reference
              </Button>
            </div>
          </div>
        </div>

        {/* Inline Reference Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Add New Reference</h2>
            
            <div className="space-y-6">
              {/* Required Fields */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Required Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Name *
                    </label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="Enter reference name" 
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+1 (555) 123-4567" 
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <Input 
                      id="company" 
                      type="text" 
                      placeholder="Previous company name" 
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Role Title
                    </label>
                    <Input 
                      id="role" 
                      type="text" 
                      placeholder="e.g., Senior Developer" 
                      value={formData.roleTitle}
                      onChange={(e) => handleInputChange('roleTitle', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                    Work Duration
                  </label>
                  <Input 
                    id="duration" 
                    type="text" 
                    placeholder="e.g., 2 years, 6 months" 
                    value={formData.workDuration}
                    onChange={(e) => handleInputChange('workDuration', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={handleCancelForm}
                size="sm"
                className="px-4 py-2 text-sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddReference}
                disabled={!formData.name.trim() || !formData.phoneNumber.trim()}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm"
              >
                Add Reference
              </Button>
            </div>
          </div>
        )}

        {/* Saved References */}
        {references.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your References</h2>
            <div className="space-y-4">
              {references.map((reference) => (
                <div 
                  key={reference.id} 
                  className="border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{reference.name}</h3>
                    <p className="text-gray-600 mb-1">{reference.phoneNumber}</p>
                    {reference.companyName && (
                      <p className="text-gray-600 mb-1">{reference.companyName}</p>
                    )}
                    {reference.roleTitle && (
                      <p className="text-gray-600 mb-1">{reference.roleTitle}</p>
                    )}
                    {reference.workDuration && (
                      <p className="text-gray-600 mb-1">Duration: {reference.workDuration}</p>
                    )}
                    <p className="text-sm text-gray-500 mb-2">Added: {reference.dateAdded}</p>
                    {reference.conversationId && (
                      <p className="text-sm text-green-600 mt-1">
                        Call ID: {reference.conversationId}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCallReference(reference)}
                      disabled={reference.callStatus === 'calling' || callInProgress}
                      variant={getCallButtonVariant(reference.callStatus)}
                      className="whitespace-nowrap"
                    >
                      {getCallButtonText(reference.callStatus)}
                    </Button>
                    {reference.callStatus === 'completed' && reference.conversationId && (
                      <Button
                        onClick={() => handleViewTranscript(reference)}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        📄 View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Call Status Info */}
            {callInProgress && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">
                  📞 Call in progress... Please wait for the call to complete before initiating another one.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {references.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-gray-500 text-lg mb-4">No references added yet.</p>
            <p className="text-gray-400">Click "Create Reference" above to add your first reference.</p>
          </div>
        )}
      </section>

      {/* Transcript Modal */}
      <TranscriptModal 
        isOpen={transcriptModal.isOpen}
        onClose={closeTranscriptModal}
        conversationId={transcriptModal.conversationId}
        referenceName={transcriptModal.referenceName}
      />
    </main>
  );
} 