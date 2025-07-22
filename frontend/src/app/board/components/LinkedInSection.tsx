'use client';

import { useState } from 'react';
import { CvData } from '@/lib/interfaces/cv';

interface LinkedInSectionProps {
  linkedinData: CvData;
}

export default function LinkedInSection({ linkedinData }: LinkedInSectionProps) {
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