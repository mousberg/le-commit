'use client';

import { useState } from 'react';
import { LinkedInData } from '@/lib/interfaces/applicant';

interface LinkedInProfileSectionProps {
  linkedinData: LinkedInData;
}

export default function LinkedInProfileSection({ linkedinData }: LinkedInProfileSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="h-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-xl hover:from-blue-100 hover:to-cyan-100 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">💼</span>
          <h3 className="text-lg font-semibold text-gray-700">LinkedIn Profile</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200 font-medium">
            ✓ Available
          </span>
        </div>
        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Name */}
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span>👤</span>
                Name
              </h4>
              <p className="text-gray-700 text-sm font-medium">{linkedinData.name}</p>
            </div>

            {/* Headline */}
            {linkedinData.headline && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>📝</span>
                  Headline
                </h4>
                <p className="text-gray-700 text-sm">{linkedinData.headline}</p>
              </div>
            )}

            {/* Location */}
            {linkedinData.location && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>📍</span>
                  Location
                </h4>
                <p className="text-gray-700 text-sm">{linkedinData.location}</p>
              </div>
            )}

            {/* Connections */}
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span>🤝</span>
                Connections
              </h4>
              <p className="text-gray-700 text-sm font-medium">{linkedinData.connections.toLocaleString()}</p>
            </div>

            {/* Experience */}
            {linkedinData.experience && linkedinData.experience.length > 0 && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🏢</span>
                  Experience
                  <span className="text-xs text-gray-500">({linkedinData.experience.length} positions)</span>
                </h4>
                <div className="space-y-3">
                  {linkedinData.experience.slice(0, 5).map((exp, i) => (
                    <div key={i} className="text-sm border-l-2 border-blue-300 pl-3">
                      <div className="font-medium text-gray-900">{exp.title}</div>
                      <div className="text-blue-600">{exp.company}</div>
                      <div className="text-xs text-gray-500">{exp.duration}</div>
                      {exp.location && (
                        <div className="text-xs text-gray-400">{exp.location}</div>
                      )}
                      {exp.description && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {exp.description}
                        </div>
                      )}
                    </div>
                  ))}
                  {linkedinData.experience.length > 5 && (
                    <div className="text-xs text-blue-600 font-medium">
                      +{linkedinData.experience.length - 5} more positions
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {linkedinData.skills && linkedinData.skills.length > 0 && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🎯</span>
                  Skills
                  <span className="text-xs text-gray-500">({linkedinData.skills.length})</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {linkedinData.skills.slice(0, 15).map((skill, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {skill}
                    </span>
                  ))}
                  {linkedinData.skills.length > 15 && (
                    <span className="text-xs text-blue-600 font-medium">
                      +{linkedinData.skills.length - 15} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {linkedinData.education && linkedinData.education.length > 0 && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🎓</span>
                  Education
                  <span className="text-xs text-gray-500">({linkedinData.education.length})</span>
                </h4>
                <div className="space-y-3">
                  {linkedinData.education.map((edu, i) => (
                    <div key={i} className="text-sm border-l-2 border-blue-300 pl-3">
                      <div className="font-medium text-gray-900">{edu.degree}</div>
                      <div className="text-blue-600">{edu.school}</div>
                      <div className="text-xs text-gray-500">{edu.years}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile URL */}
            <div className="col-span-2 bg-white/70 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span>🔗</span>
                Profile URL
              </h4>
              <a 
                href={linkedinData.profileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
              >
                {linkedinData.profileUrl}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}