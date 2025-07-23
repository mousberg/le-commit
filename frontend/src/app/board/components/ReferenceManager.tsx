'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ReferenceForm from './ReferenceForm';
import ReferenceCard from './ReferenceCard';

export interface Reference {
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

export interface ReferenceFormData {
  name: string;
  phoneNumber: string;
  companyName: string;
  roleTitle: string;
  workDuration: string;
}

interface ReferenceManagerProps {
  references: Reference[];
  onAddReference: (reference: Reference) => void;
  onCallReference: (reference: Reference) => Promise<void>;
  onViewTranscript: (reference: Reference) => void;
  callInProgress: boolean;
}

export default function ReferenceManager({
  references,
  onAddReference,
  onCallReference,
  onViewTranscript,
  callInProgress
}: ReferenceManagerProps) {
  const [addingReference, setAddingReference] = useState(false);
  const [newReferenceForm, setNewReferenceForm] = useState<ReferenceFormData>({
    name: '',
    phoneNumber: '',
    companyName: '',
    roleTitle: '',
    workDuration: ''
  });
  const [openReferenceId, setOpenReferenceId] = useState<string | null>(null);

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
      
      onAddReference(reference);
      setAddingReference(false);
      setNewReferenceForm({ name: '', phoneNumber: '', companyName: '', roleTitle: '', workDuration: '' });
      // Automatically open the newly created reference card
      setOpenReferenceId(reference.id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <span className="text-xl">📞</span>
            Reference Calls
          </h3>
          <p className="text-sm text-gray-500 mt-1">Contact and verify professional references</p>
        </div>
        <Button 
          size="sm" 
          onClick={handleStartAddReference} 
          className="bg-purple-600 hover:bg-purple-700 text-white" 
          disabled={addingReference}
        >
          + Add Reference
        </Button>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {addingReference && (
            <ReferenceForm
              formData={newReferenceForm}
              onFormChange={handleNewReferenceFormChange}
              onCancel={handleCancelAddReference}
              onConfirm={handleConfirmAddReference}
            />
          )}
          
          {references.map((reference) => (
            <ReferenceCard
              key={reference.id}
              reference={reference}
              isOpen={openReferenceId === reference.id}
              onToggle={() => setOpenReferenceId(openReferenceId === reference.id ? null : reference.id)}
              onCall={onCallReference}
              onViewTranscript={onViewTranscript}
              callInProgress={callInProgress}
            />
          ))}
          
          {references.length === 0 && (
            <div className="text-gray-400 text-center py-6">No references added yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}