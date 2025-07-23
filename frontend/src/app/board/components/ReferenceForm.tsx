'use client';

import { Button } from '@/components/ui/button';
import { ReferenceFormData } from './ReferenceManager';

interface ReferenceFormProps {
  formData: ReferenceFormData;
  onFormChange: (field: keyof ReferenceFormData, value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ReferenceForm({ formData, onFormChange, onCancel, onConfirm }: ReferenceFormProps) {
  return (
    <div className="border border-gray-200 rounded-xl bg-slate-50 p-6 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <input
          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
          placeholder="Reference Name*"
          value={formData.name}
          onChange={e => onFormChange('name', e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
          placeholder="Phone Number*"
          value={formData.phoneNumber}
          onChange={e => onFormChange('phoneNumber', e.target.value)}
        />
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <input
          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
          placeholder="Company Name"
          value={formData.companyName}
          onChange={e => onFormChange('companyName', e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2 text-gray-800 w-full md:w-1/2"
          placeholder="Role Title"
          value={formData.roleTitle}
          onChange={e => onFormChange('roleTitle', e.target.value)}
        />
      </div>
      <input
        className="border rounded-md px-3 py-2 text-gray-800 w-full"
        placeholder="Work Duration"
        value={formData.workDuration}
        onChange={e => onFormChange('workDuration', e.target.value)}
      />
      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={onCancel} size="sm">
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          disabled={!formData.name.trim() || !formData.phoneNumber.trim()} 
          size="sm" 
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}