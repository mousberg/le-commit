'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';
import { CvData, Experience } from '@/lib/interfaces/cv';

interface DataComparisonSectionProps {
  cvData?: CvData;
  linkedinData?: CvData;
}

export default function DataComparisonSection({ cvData, linkedinData }: DataComparisonSectionProps) {
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