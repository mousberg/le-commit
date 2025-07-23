'use client';

import { useState } from 'react';
import { GitHubData } from '@/lib/interfaces/github';

interface GitHubSectionProps {
  githubData: GitHubData;
}

export default function GitHubSection({ githubData }: GitHubSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="h-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐙</span>
          <h3 className="text-lg font-semibold text-gray-900">GitHub Data</h3>
          <a
            href={githubData.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            @{githubData.username} ↗
          </a>
        </div>
        <span className="ml-2 text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>📊</span>
                Activity Overview
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">📦 Public Repos:</span>
                  <span className="font-medium">{githubData.publicRepos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">👥 Followers:</span>
                  <span className="font-medium">{githubData.followers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">⭐ Total Stars:</span>
                  <span className="font-medium">{githubData.starredRepos}</span>
                </div>
                {githubData.contributions && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">🔥 Streak:</span>
                    <span className="font-medium">{githubData.contributions.streakDays} days</span>
                  </div>
                )}
              </div>
            </div>

            {githubData.languages && githubData.languages.length > 0 && (
              <div className="bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💻</span>
                  Top Languages
                </h4>
                <div className="space-y-2">
                  {githubData.languages.slice(0, 5).map((lang, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 font-medium">{lang.language}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${lang.percentage}%` }}
                          />
                        </div>
                        <span className="text-gray-500 text-xs">{lang.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {githubData.repositories && githubData.repositories.length > 0 && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📂</span>
                  Notable Repositories
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {githubData.repositories
                    .filter(repo => !repo.isFork && repo.stars > 0)
                    .slice(0, 4)
                    .map((repo, i) => (
                      <div key={i} className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-sm text-gray-900">{repo.name}</span>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">⭐ {repo.stars}</span>
                            <span className="flex items-center gap-1">🍴 {repo.forks}</span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{repo.description}</p>
                        )}
                        {repo.language && (
                          <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                            {repo.language}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {githubData.overallQualityScore && (
              <div className="col-span-2 bg-white/70 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🏆</span>
                  Code Quality Metrics
                </h4>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Overall Quality Score</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {githubData.overallQualityScore.overall}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">📖 README:</span>
                      <span className="font-medium">{githubData.overallQualityScore.readme}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">🔄 CI/CD:</span>
                      <span className="font-medium">{githubData.overallQualityScore.cicd}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">📚 Docs:</span>
                      <span className="font-medium">{githubData.overallQualityScore.documentation}/100</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}