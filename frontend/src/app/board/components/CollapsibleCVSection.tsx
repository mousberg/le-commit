'use client';

import { useState } from 'react';
import { CvData, Experience, Education } from '@/lib/interfaces/cv';

interface CollapsibleCVSectionProps {
  cvData: CvData;
}

export default function CollapsibleCVSection({ cvData }: CollapsibleCVSectionProps) {
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