'use client';

import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Save, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ATSCandidate } from '@/lib/ashby/interfaces';

interface ManualAssessmentSectionProps {
  candidate: ATSCandidate;
  onUpdate?: (candidate: ATSCandidate) => void;
}

export function ManualAssessmentSection({ candidate, onUpdate }: ManualAssessmentSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    manual_score: candidate.manual_score || '',
    notes: candidate.notes || ''
  });
  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    // Update form data when candidate changes
    setFormData({
      manual_score: candidate.manual_score || '',
      notes: candidate.notes || ''
    });
  }, [candidate.manual_score, candidate.notes]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      manual_score: candidate.manual_score || '',
      notes: candidate.notes || ''
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Validate score
      let scoreValue: number | null = null;
      if (formData.manual_score !== '') {
        scoreValue = parseInt(formData.manual_score.toString());
        if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
          showNotification('error', 'Score must be a number between 0 and 100');
          setIsLoading(false);
          return;
        }
      }

      // Validate notes length
      if (formData.notes && formData.notes.length > 1000) {
        showNotification('error', 'Notes must be 1000 characters or less');
        setIsLoading(false);
        return;
      }

      // UI-only mode: Simulate save without database calls
      console.log('UI-only mode: Manual assessment save simulated', {
        scoreValue,
        notes: formData.notes,
        candidateId: candidate.unmask_applicant_id
      });

      // Update local state only
      const updatedCandidate = {
        ...candidate,
        manual_score: scoreValue,
        notes: formData.notes || null,
        score: scoreValue || candidate.score
      };

      if (onUpdate) {
        onUpdate(updatedCandidate);
      }

      setIsEditing(false);
      showNotification('success', 'Assessment saved (UI-only mode)');

    } catch (error) {
      console.error('Failed to save assessment:', error);
      showNotification('error', 'Failed to save assessment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };



  const hasAssessment = candidate.manual_score !== null || (candidate.notes && candidate.notes.trim() !== '');

  return (
    <Card className="p-4 mb-6 border-l-4 border-l-blue-500">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Manual Assessment</h3>
            {hasAssessment && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {candidate.manual_score !== null ? `Score: ${candidate.manual_score}` : 'Notes Added'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-4">
          {/* Score Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Score (0-100)
            </label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.manual_score}
                onChange={(e) => setFormData({ ...formData, manual_score: e.target.value })}
                placeholder="Enter score..."
                className="w-full"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                {candidate.manual_score !== null ? (
                  <span className="font-medium">{candidate.manual_score}</span>
                ) : (
                  <span className="text-gray-500 italic">No score set</span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assessment Notes
            <span className="text-gray-500 text-xs ml-2">(max 1000 characters)</span>
          </label>
          {isEditing ? (
            <div className="relative">
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter your assessment notes..."
                className="min-h-[100px] resize-none"
                maxLength={1000}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {formData.notes.length}/1000
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-md min-h-[100px]">
              {candidate.notes ? (
                <p className="text-gray-900 whitespace-pre-wrap">{candidate.notes}</p>
              ) : (
                <span className="text-gray-500 italic">No notes added</span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-right duration-300">
          <div className={`
            px-6 py-4 rounded-lg shadow-lg max-w-sm
            ${notification.type === 'success' 
              ? 'bg-green-600 text-white' 
              : notification.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
            }
          `}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
              )}
              <p className="text-sm font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto hover:bg-black/20 p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}