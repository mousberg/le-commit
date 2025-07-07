import { 
  GitHubData, 
  GitHubRepository, 
  GitHubLanguageStats, 
  GitHubContributionStats, 
  GitHubOrganization,
  GitHubRepositoryContent,
  GitHubReadmeAnalysis,
  GitHubPackageAnalysis,
  GitHubWorkflowAnalysis,
  GitHubCodeStructure,
  GitHubQualityScore
} from '../interfaces'
import * as fs from 'fs'
import * as path from 'path'

/**
 * GitHub API configuration
 */
const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN // Optional for higher rate limits

/**
 * GitHub API headers with authentication if token is available
 */
function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'le-commit-github-analyzer'
  }
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }
  
  return headers
}

/**
 * Generate JSON schema for GitHubData interface
 */
function getGitHubDataSchema() {
  return {
    type: "object",
    description: "GitHub account data structure",
    properties: {
      username: {
        type: "string",
        description: "GitHub username/login"
      },
      name: {
        type: "string",
        description: "Display name"
      },
      bio: {
        type: "string",
        description: "User biography/description"
      },
      location: {
        type: "string",
        description: "User location"
      },
      email: {
        type: "string",
        description: "Public email address"
      },
      blog: {
        type: "string",
        description: "Website/blog URL"
      },
      company: {
        type: "string",
        description: "Company/organization"
      },
      profileUrl: {
        type: "string",
        description: "GitHub profile URL"
      },
      avatarUrl: {
        type: "string",
        description: "Profile avatar image URL"
      },
      followers: {
        type: "number",
        description: "Number of followers"
      },
      following: {
        type: "number",
        description: "Number of users following"
      },
      publicRepos: {
        type: "number",
        description: "Number of public repositories"
      },
      publicGists: {
        type: "number",
        description: "Number of public gists"
      },
      accountCreationDate: {
        type: "string",
        description: "Account creation date (ISO 8601)"
      },
      lastActivityDate: {
        type: "string",
        description: "Last activity date (ISO 8601)"
      },
      repositories: {
        type: "array",
        description: "User's repositories",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Repository name" },
            fullName: { type: "string", description: "Full repository name (owner/repo)" },
            description: { type: "string", description: "Repository description" },
            language: { type: "string", description: "Primary programming language" },
            stars: { type: "number", description: "Number of stars" },
            forks: { type: "number", description: "Number of forks" },
            watchers: { type: "number", description: "Number of watchers" },
            size: { type: "number", description: "Repository size in KB" },
            isPrivate: { type: "boolean", description: "Whether repository is private" },
            isFork: { type: "boolean", description: "Whether repository is a fork" },
            createdAt: { type: "string", description: "Creation date (ISO 8601)" },
            updatedAt: { type: "string", description: "Last update date (ISO 8601)" },
            topics: { type: "array", items: { type: "string" }, description: "Repository topics/tags" },
            url: { type: "string", description: "Repository URL" },
            cloneUrl: { type: "string", description: "Git clone URL" },
            license: { type: "string", description: "License name" },
            hasIssues: { type: "boolean", description: "Whether issues are enabled" },
            hasProjects: { type: "boolean", description: "Whether projects are enabled" },
            hasWiki: { type: "boolean", description: "Whether wiki is enabled" },
            hasPages: { type: "boolean", description: "Whether GitHub Pages is enabled" },
            openIssues: { type: "number", description: "Number of open issues" },
            defaultBranch: { type: "string", description: "Default branch name" }
          }
        }
      },
      languages: {
        type: "array",
        description: "Programming language statistics",
        items: {
          type: "object",
          properties: {
            language: { type: "string", description: "Language name" },
            percentage: { type: "number", description: "Percentage of total code" },
            bytes: { type: "number", description: "Number of bytes" }
          }
        }
      },
      contributions: {
        type: "object",
        description: "Contribution statistics",
        properties: {
          totalCommits: { type: "number", description: "Total commits across all repos" },
          totalPullRequests: { type: "number", description: "Total pull requests" },
          totalIssues: { type: "number", description: "Total issues opened" },
          totalRepositories: { type: "number", description: "Total repositories" },
          streakDays: { type: "number", description: "Current contribution streak" },
          contributionsLastYear: { type: "number", description: "Contributions in the last year" },
          mostActiveDay: { type: "string", description: "Most active day of the week" },
          mostUsedLanguage: { type: "string", description: "Most frequently used language" }
        }
      },
      starredRepos: {
        type: "number",
        description: "Number of starred repositories"
      },
      forkedRepos: {
        type: "number",
        description: "Number of forked repositories"
      },
      organizations: {
        type: "array",
        description: "Organizations the user belongs to",
        items: {
          type: "object",
          properties: {
            login: { type: "string", description: "Organization login/username" },
            name: { type: "string", description: "Organization display name" },
            description: { type: "string", description: "Organization description" },
            url: { type: "string", description: "Organization URL" },
            avatarUrl: { type: "string", description: "Organization avatar URL" },
            publicRepos: { type: "number", description: "Number of public repositories" },
            location: { type: "string", description: "Organization location" },
            blog: { type: "string", description: "Organization website" },
            email: { type: "string", description: "Organization email" },
            createdAt: { type: "string", description: "Organization creation date" }
          }
        }
      },
      other: {
        type: "object",
        description: "Any additional information not covered by other fields",
        additionalProperties: true
      }
    },
    required: ["username", "name", "profileUrl", "followers", "following", "publicRepos", "accountCreationDate", "repositories", "languages", "contributions", "organizations", "other"]
  }
}

/**
 * Extract username from GitHub URL
 * @param githubUrl - GitHub profile URL or username
 * @returns Extracted username
 */
export function extractUsernameFromUrl(githubUrl: string): string {
  try {
    // Handle various GitHub URL formats
    const url = githubUrl.trim()
    
    // If it's already just a username
    if (!url.includes('/') && !url.includes('.')) {
      return url
    }
    
    // Handle full URLs
    const patterns = [
      /github\.com\/([^\/\?#]+)/i,  // https://github.com/username
      /^([^\/\?#]+)$/,              // Just username
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    throw new Error('Could not extract username from URL')
  } catch (error) {
    console.error('Error extracting username from URL:', error)
    throw new Error(`Invalid GitHub URL format: ${githubUrl}`)
  }
}

/**
 * Fetch data from GitHub API with error handling
 * @param endpoint - API endpoint (relative to base URL)
 * @param username - GitHub username for error context
 * @returns API response data
 */
async function fetchGitHubApi(endpoint: string, username?: string): Promise<any> {
  try {
    const url = `${GITHUB_API_BASE}${endpoint}`
    const headers = getGitHubHeaders()
    
    console.log(`Fetching: ${url}`)
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`GitHub user '${username}' not found`)
      } else if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Consider adding a GitHub token.')
      } else {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error)
    throw error
  }
}

/**
 * Get basic user information from GitHub API
 * @param username - GitHub username
 * @returns Basic user data
 */
export async function getGitHubUserInfo(username: string): Promise<Partial<GitHubData>> {
  try {
    const userData = await fetchGitHubApi(`/users/${username}`, username)
    
    return {
      username: userData.login,
      name: userData.name || '',
      bio: userData.bio || '',
      location: userData.location || '',
      email: userData.email || '',
      blog: userData.blog || '',
      company: userData.company || '',
      profileUrl: userData.html_url,
      avatarUrl: userData.avatar_url,
      followers: userData.followers || 0,
      following: userData.following || 0,
      publicRepos: userData.public_repos || 0,
      publicGists: userData.public_gists || 0,
      accountCreationDate: userData.created_at,
      lastActivityDate: userData.updated_at,
    }
  } catch (error) {
    console.error('Error getting GitHub user info:', error)
    throw new Error(`Failed to get user info: ${error}`)
  }
}

/**
 * Get user's repositories from GitHub API
 * @param username - GitHub username
 * @param maxRepos - Maximum number of repositories to fetch (default: 100)
 * @returns Array of repositories
 */
export async function getGitHubUserRepositories(
  username: string,
  maxRepos: number = 100
): Promise<GitHubRepository[]> {
  try {
    const repositories: GitHubRepository[] = []
    let page = 1
    const perPage = Math.min(maxRepos, 100) // GitHub API max is 100 per page
    
    while (repositories.length < maxRepos) {
      const repoData = await fetchGitHubApi(
        `/users/${username}/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`,
        username
      )
      
      if (!repoData || repoData.length === 0) {
        break
      }
      
      for (const repo of repoData) {
        if (repositories.length >= maxRepos) break
        
        repositories.push({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || '',
          language: repo.language || '',
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          watchers: repo.watchers_count || 0,
          size: repo.size || 0,
          isPrivate: repo.private || false,
          isFork: repo.fork || false,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          topics: repo.topics || [],
          url: repo.html_url,
          cloneUrl: repo.clone_url,
          license: repo.license?.name || '',
          hasIssues: repo.has_issues || false,
          hasProjects: repo.has_projects || false,
          hasWiki: repo.has_wiki || false,
          hasPages: repo.has_pages || false,
          openIssues: repo.open_issues_count || 0,
          defaultBranch: repo.default_branch || 'main',
        })
      }
      
      page++
    }
    
    return repositories
  } catch (error) {
    console.error('Error getting GitHub repositories:', error)
    throw new Error(`Failed to get repositories: ${error}`)
  }
}

/**
 * Calculate language statistics from repositories
 * @param repositories - Array of repositories
 * @returns Language statistics
 */
export function calculateLanguageStats(repositories: GitHubRepository[]): GitHubLanguageStats[] {
  try {
    const languageBytes: Record<string, number> = {}
    let totalBytes = 0
    
    // Count languages by repository size (approximation)
    for (const repo of repositories) {
      if (repo.language && repo.size > 0) {
        languageBytes[repo.language] = (languageBytes[repo.language] || 0) + repo.size
        totalBytes += repo.size
      }
    }
    
    // Convert to percentage-based statistics
    const languageStats: GitHubLanguageStats[] = Object.entries(languageBytes)
      .map(([language, bytes]) => ({
        language,
        bytes,
        percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
    
    return languageStats
  } catch (error) {
    console.error('Error calculating language statistics:', error)
    return []
  }
}

/**
 * Get user's organizations from GitHub API
 * @param username - GitHub username
 * @returns Array of organizations
 */
export async function getGitHubUserOrganizations(username: string): Promise<GitHubOrganization[]> {
  try {
    const orgData = await fetchGitHubApi(`/users/${username}/orgs`, username)
    
    const organizations: GitHubOrganization[] = []
    
    for (const org of orgData) {
      // Get detailed organization info
      try {
        const detailedOrg = await fetchGitHubApi(`/orgs/${org.login}`)
        
        organizations.push({
          login: detailedOrg.login,
          name: detailedOrg.name || detailedOrg.login,
          description: detailedOrg.description || '',
          url: detailedOrg.html_url,
          avatarUrl: detailedOrg.avatar_url,
          publicRepos: detailedOrg.public_repos || 0,
          location: detailedOrg.location || '',
          blog: detailedOrg.blog || '',
          email: detailedOrg.email || '',
          createdAt: detailedOrg.created_at,
        })
      } catch (orgError) {
        // If we can't get detailed info, use basic info
        organizations.push({
          login: org.login,
          name: org.login,
          description: '',
          url: org.url,
          avatarUrl: org.avatar_url,
          publicRepos: 0,
          location: '',
          blog: '',
          email: '',
          createdAt: '',
        })
      }
    }
    
    return organizations
  } catch (error) {
    console.error('Error getting GitHub organizations:', error)
    return []
  }
}

/**
 * Calculate contribution statistics from available data
 * @param repositories - User's repositories
 * @param userInfo - Basic user information
 * @param languageStats - Language statistics
 * @returns Contribution statistics
 */
export function calculateContributionStats(
  repositories: GitHubRepository[],
  userInfo: Partial<GitHubData>,
  languageStats: GitHubLanguageStats[]
): GitHubContributionStats {
  try {
    // Calculate basic stats from available data
    const totalRepositories = repositories.length
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stars, 0)
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks, 0)
    const ownRepos = repositories.filter(repo => !repo.isFork)
    const forkedRepos = repositories.filter(repo => repo.isFork)
    
    // Find most used language
    const mostUsedLanguage = languageStats.length > 0 ? languageStats[0].language : ''
    
    // Estimate activity based on repository updates
    const recentlyUpdated = repositories.filter(repo => {
      const updatedDate = new Date(repo.updatedAt)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      return updatedDate > oneYearAgo
    }).length
    
    return {
      totalCommits: 0, // Would need additional API calls to get accurate commit count
      totalPullRequests: 0, // Would need additional API calls
      totalIssues: 0, // Would need additional API calls
      totalRepositories,
      streakDays: 0, // Would need contribution calendar data
      contributionsLastYear: recentlyUpdated,
      mostActiveDay: '', // Would need contribution calendar data
      mostUsedLanguage,
    }
  } catch (error) {
    console.error('Error calculating contribution statistics:', error)
    return {
      totalCommits: 0,
      totalPullRequests: 0,
      totalIssues: 0,
      totalRepositories: 0,
      streakDays: 0,
      contributionsLastYear: 0,
      mostActiveDay: '',
      mostUsedLanguage: '',
    }
  }
}

/**
 * Get file content from a repository
 * @param username - Repository owner
 * @param repoName - Repository name
 * @param filePath - Path to the file in the repository
 * @returns File content as string or null if not found
 */
async function getRepositoryFileContent(
  username: string,
  repoName: string,
  filePath: string
): Promise<string | null> {
  try {
    const response = await fetchGitHubApi(`/repos/${username}/${repoName}/contents/${filePath}`)
    
    if (response.type === 'file' && response.content) {
      // GitHub API returns base64 encoded content
      return Buffer.from(response.content, 'base64').toString('utf-8')
    }
    
    return null
  } catch (error) {
    // File doesn't exist or other error
    return null
  }
}

/**
 * Get repository directory contents
 * @param username - Repository owner
 * @param repoName - Repository name
 * @param dirPath - Directory path (empty for root)
 * @returns Array of file/directory information
 */
async function getRepositoryDirectoryContents(
  username: string,
  repoName: string,
  dirPath: string = ''
): Promise<any[]> {
  try {
    const response = await fetchGitHubApi(`/repos/${username}/${repoName}/contents/${dirPath}`)
    return Array.isArray(response) ? response : []
  } catch (error) {
    return []
  }
}

/**
 * Analyze README file content
 * @param readmeContent - README file content
 * @returns README analysis
 */
function analyzeReadmeContent(readmeContent: string | null): GitHubReadmeAnalysis {
  if (!readmeContent) {
    return {
      exists: false,
      length: 0,
      sections: [],
      hasBadges: false,
      hasInstallInstructions: false,
      hasUsageExamples: false,
      hasContributing: false,
      hasLicense: false,
      imageCount: 0,
      linkCount: 0,
      codeBlockCount: 0,
      qualityScore: 0,
    }
  }

  const content = readmeContent.toLowerCase()
  const lines = readmeContent.split('\n')
  
  // Extract sections (lines starting with #)
  const sections = lines
    .filter(line => line.trim().startsWith('#'))
    .map(line => line.replace(/^#+\s*/, '').trim())
  
  // Count various elements
  const imageCount = (readmeContent.match(/!\[.*?\]\(.*?\)/g) || []).length
  const linkCount = (readmeContent.match(/\[.*?\]\(.*?\)/g) || []).length
  const codeBlockCount = (readmeContent.match(/```/g) || []).length / 2
  
  // Check for key sections and content
  const hasBadges = /!\[.*?\]\(https?:\/\/.*?(shields\.io|badge|travis|circleci|github\.com\/.*\/workflows)/i.test(readmeContent)
  const hasInstallInstructions = /install|npm i|yarn add|pip install|composer install|go get/i.test(content)
  const hasUsageExamples = /usage|example|getting started|quick start/i.test(content) && codeBlockCount > 0
  const hasContributing = /contributing|contribution/i.test(content)
  const hasLicense = /license|mit|apache|gpl/i.test(content)
  
  // Calculate quality score (0-100)
  let qualityScore = 0
  
  // Length scoring (0-25 points)
  if (readmeContent.length > 500) qualityScore += 5
  if (readmeContent.length > 1500) qualityScore += 5
  if (readmeContent.length > 3000) qualityScore += 10
  if (readmeContent.length < 10000) qualityScore += 5 // Not too long
  
  // Content scoring (0-75 points)
  if (sections.length >= 3) qualityScore += 10
  if (hasBadges) qualityScore += 10
  if (hasInstallInstructions) qualityScore += 15
  if (hasUsageExamples) qualityScore += 15
  if (hasContributing) qualityScore += 10
  if (hasLicense) qualityScore += 5
  if (imageCount > 0) qualityScore += 5
  if (codeBlockCount >= 2) qualityScore += 5
  
  return {
    exists: true,
    length: readmeContent.length,
    sections,
    hasBadges,
    hasInstallInstructions,
    hasUsageExamples,
    hasContributing,
    hasLicense,
    imageCount,
    linkCount,
    codeBlockCount,
    qualityScore: Math.min(100, qualityScore),
  }
}

/**
 * Analyze package.json content
 * @param packageContent - package.json content
 * @returns Package analysis
 */
function analyzePackageJson(packageContent: string | null): GitHubPackageAnalysis | undefined {
  if (!packageContent) {
    return undefined
  }

  try {
    const pkg = JSON.parse(packageContent)
    
    const scripts = pkg.scripts || {}
    const dependencies = pkg.dependencies || {}
    const devDependencies = pkg.devDependencies || {}
    
    const hasLinting = Object.keys({...dependencies, ...devDependencies}).some(dep => 
      /eslint|tslint|prettier|stylelint|jshint/.test(dep)
    ) || Object.keys(scripts).some(script => /lint|format/.test(script))
    
    const hasTesting = Object.keys({...dependencies, ...devDependencies}).some(dep => 
      /jest|mocha|chai|jasmine|karma|ava|tape|cypress|playwright/.test(dep)
    ) || Object.keys(scripts).some(script => /test|spec/.test(script))
    
    const hasTypeScript = Object.keys({...dependencies, ...devDependencies}).some(dep => 
      /typescript|@types\//.test(dep)
    )
    
    const hasDocumentation = Object.keys(scripts).some(script => 
      /docs|documentation|typedoc|jsdoc/.test(script)
    )
    
    return {
      exists: true,
      hasScripts: Object.keys(scripts).length > 0,
      scriptCount: Object.keys(scripts).length,
      dependencyCount: Object.keys(dependencies).length,
      devDependencyCount: Object.keys(devDependencies).length,
      hasLinting,
      hasTesting,
      hasTypeScript,
      hasDocumentation,
      hasValidLicense: !!pkg.license,
    }
  } catch (error) {
    console.warn('Failed to parse package.json:', error)
    return {
      exists: true,
      hasScripts: false,
      scriptCount: 0,
      dependencyCount: 0,
      devDependencyCount: 0,
      hasLinting: false,
      hasTesting: false,
      hasTypeScript: false,
      hasDocumentation: false,
      hasValidLicense: false,
    }
  }
}

/**
 * Analyze GitHub workflow files
 * @param username - Repository owner
 * @param repoName - Repository name
 * @returns Array of workflow analyses
 */
async function analyzeGitHubWorkflows(
  username: string,
  repoName: string
): Promise<GitHubWorkflowAnalysis[]> {
  try {
    const workflowsDir = await getRepositoryDirectoryContents(username, repoName, '.github/workflows')
    const workflows: GitHubWorkflowAnalysis[] = []
    
    for (const file of workflowsDir) {
      if (file.type === 'file' && (file.name.endsWith('.yml') || file.name.endsWith('.yaml'))) {
        const content = await getRepositoryFileContent(username, repoName, `.github/workflows/${file.name}`)
        
        if (content) {
          const analysis = analyzeWorkflowContent(file.name, content)
          workflows.push(analysis)
        }
      }
    }
    
    return workflows
  } catch (error) {
    console.warn('Failed to analyze workflows:', error)
    return []
  }
}

/**
 * Analyze individual workflow content
 * @param fileName - Workflow file name
 * @param content - Workflow YAML content
 * @returns Workflow analysis
 */
function analyzeWorkflowContent(fileName: string, content: string): GitHubWorkflowAnalysis {
  const lines = content.split('\n')
  const lowerContent = content.toLowerCase()
  
  // Extract workflow name
  const nameMatch = content.match(/name:\s*(.+)/i)
  const name = nameMatch ? nameMatch[1].trim().replace(/['"]/g, '') : fileName
  
  // Extract triggers
  const triggers: string[] = []
  if (lowerContent.includes('on:')) {
    if (lowerContent.includes('push')) triggers.push('push')
    if (lowerContent.includes('pull_request')) triggers.push('pull_request')
    if (lowerContent.includes('schedule')) triggers.push('schedule')
    if (lowerContent.includes('workflow_dispatch')) triggers.push('manual')
  }
  
  // Extract job names
  const jobMatches = content.match(/^\s{2}[a-zA-Z0-9_-]+:/gm) || []
  const jobs = jobMatches.map(match => match.trim().replace(':', ''))
  
  // Analyze job types
  const hasTestJob = /test|spec|jest|mocha|cypress|playwright/i.test(content)
  const hasLintJob = /lint|format|eslint|prettier/i.test(content)
  const hasBuildJob = /build|compile|webpack|rollup|vite/i.test(content)
  const hasDeployJob = /deploy|publish|release/i.test(content)
  
  // Check for advanced features
  const usesSecrets = /secrets\./i.test(content)
  const matrixStrategy = /strategy:\s*matrix:/i.test(content)
  
  // Calculate complexity score
  let complexity = 0
  complexity += jobs.length * 10 // 10 points per job
  complexity += triggers.length * 5 // 5 points per trigger
  if (hasTestJob) complexity += 15
  if (hasLintJob) complexity += 10
  if (hasBuildJob) complexity += 10
  if (hasDeployJob) complexity += 15
  if (usesSecrets) complexity += 10
  if (matrixStrategy) complexity += 20
  
  return {
    name,
    fileName,
    triggers,
    jobs,
    hasTestJob,
    hasLintJob,
    hasBuildJob,
    hasDeployJob,
    usesSecrets,
    matrixStrategy,
    complexity: Math.min(100, complexity),
  }
}

/**
 * Analyze repository code structure
 * @param username - Repository owner
 * @param repoName - Repository name
 * @returns Code structure analysis
 */
async function analyzeCodeStructure(
  username: string,
  repoName: string
): Promise<GitHubCodeStructure> {
  try {
    const rootContents = await getRepositoryDirectoryContents(username, repoName, '')
    
    let fileCount = 0
    let directoryCount = 0
    const languageFiles: Record<string, number> = {}
    let hasTests = false
    const testFrameworks: string[] = []
    let hasDocumentation = false
    let hasExamples = false
    let hasConfigFiles = false
    
    // Analyze root level files and directories
    for (const item of rootContents) {
      if (item.type === 'file') {
        fileCount++
        
        // Check file extensions for languages
        const ext = path.extname(item.name).toLowerCase()
        if (ext) {
          languageFiles[ext] = (languageFiles[ext] || 0) + 1
        }
        
        // Check for config files
        if (/\.(json|yml|yaml|toml|ini|conf|config)$/.test(item.name.toLowerCase()) ||
            /^(\..*rc|\..*ignore|.*\.config\.|dockerfile)/i.test(item.name)) {
          hasConfigFiles = true
        }
      } else if (item.type === 'dir') {
        directoryCount++
        
        const dirName = item.name.toLowerCase()
        
        // Check for test directories
        if (/test|spec|__tests__|tests/.test(dirName)) {
          hasTests = true
        }
        
        // Check for documentation directories
        if (/docs?|documentation|wiki/.test(dirName)) {
          hasDocumentation = true
        }
        
        // Check for examples directories
        if (/examples?|demo|samples?/.test(dirName)) {
          hasExamples = true
        }
      }
    }
    
    // Detect test frameworks from package.json or file patterns
    // This would be enhanced with actual file content analysis
    
    // Calculate organization score
    let organizationScore = 0
    
    // Structure points (0-40)
    if (hasTests) organizationScore += 20
    if (hasDocumentation) organizationScore += 10
    if (hasExamples) organizationScore += 10
    
    // File organization points (0-30)
    if (directoryCount >= 3) organizationScore += 10
    if (hasConfigFiles) organizationScore += 10
    if (fileCount > 5 && fileCount < 100) organizationScore += 10 // Not too few, not too many in root
    
    // Language diversity (0-30)
    const languageCount = Object.keys(languageFiles).length
    if (languageCount >= 2) organizationScore += 10
    if (languageCount >= 4) organizationScore += 10
    if (languageCount <= 8) organizationScore += 10 // Not too diverse
    
    return {
      fileCount,
      directoryCount,
      languageFiles,
      hasTests,
      testFrameworks,
      hasDocumentation,
      hasExamples,
      hasConfigFiles,
      organizationScore: Math.min(100, organizationScore),
    }
  } catch (error) {
    console.warn('Failed to analyze code structure:', error)
    return {
      fileCount: 0,
      directoryCount: 0,
      languageFiles: {},
      hasTests: false,
      testFrameworks: [],
      hasDocumentation: false,
      hasExamples: false,
      hasConfigFiles: false,
      organizationScore: 0,
    }
  }
}

/**
 * Calculate overall quality score for a repository
 * @param readme - README analysis
 * @param packageJson - Package.json analysis
 * @param workflows - Workflow analyses
 * @param codeStructure - Code structure analysis
 * @param repository - Repository metadata
 * @returns Quality score breakdown
 */
function calculateRepositoryQualityScore(
  readme: GitHubReadmeAnalysis,
  packageJson: GitHubPackageAnalysis | undefined,
  workflows: GitHubWorkflowAnalysis[],
  codeStructure: GitHubCodeStructure,
  repository: GitHubRepository
): GitHubQualityScore {
  const breakdown = {
    readmeQuality: readme.qualityScore,
    hasCI: workflows.length > 0 ? 100 : 0,
    hasTests: codeStructure.hasTests ? 100 : 0,
    hasLinting: packageJson?.hasLinting ? 100 : 0,
    dependencyHealth: packageJson ? Math.max(0, 100 - (packageJson.outdatedDependencies || 0) * 10) : 50,
    communityFiles: (readme.hasContributing ? 50 : 0) + (readme.hasLicense ? 50 : 0),
    recentActivity: Math.max(0, 100 - Math.floor((Date.now() - new Date(repository.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 7))), // Weeks since update
  }
  
  // Weighted average
  const weights = {
    readmeQuality: 0.25,
    hasCI: 0.15,
    hasTests: 0.15,
    hasLinting: 0.10,
    dependencyHealth: 0.10,
    communityFiles: 0.15,
    recentActivity: 0.10,
  }
  
  const overall = Object.entries(breakdown).reduce((sum, [key, value]) => {
    return sum + (value * weights[key as keyof typeof weights])
  }, 0)
  
  return {
    overall: Math.round(overall),
    readme: readme.qualityScore,
    codeOrganization: codeStructure.organizationScore,
    cicd: workflows.length > 0 ? Math.round(workflows.reduce((sum, w) => sum + w.complexity, 0) / workflows.length) : 0,
    documentation: codeStructure.hasDocumentation ? 80 : (readme.exists ? 60 : 0),
    maintenance: Math.round((breakdown.recentActivity + breakdown.dependencyHealth) / 2),
    community: Math.round((breakdown.communityFiles + (repository.stars > 10 ? 20 : 0)) / 2),
    breakdown,
  }
}

/**
 * Analyze repository content comprehensively
 * @param repository - Repository information
 * @returns Repository content analysis
 */
export async function analyzeRepositoryContent(repository: GitHubRepository): Promise<GitHubRepositoryContent> {
  try {
    console.log(`Analyzing content for repository: ${repository.name}`)
    
    const [owner, repoName] = repository.fullName.split('/')
    
    // Analyze README
    const readmeContent = await getRepositoryFileContent(owner, repoName, 'README.md') ||
                          await getRepositoryFileContent(owner, repoName, 'readme.md') ||
                          await getRepositoryFileContent(owner, repoName, 'README.rst') ||
                          await getRepositoryFileContent(owner, repoName, 'README.txt')
    
    const readme = analyzeReadmeContent(readmeContent)
    
    // Analyze package.json (if it exists)
    const packageContent = await getRepositoryFileContent(owner, repoName, 'package.json')
    const packageJson = analyzePackageJson(packageContent)
    
    // Analyze workflows
    const workflows = await analyzeGitHubWorkflows(owner, repoName)
    
    // Analyze code structure
    const codeStructure = await analyzeCodeStructure(owner, repoName)
    
    // Calculate quality score
    const qualityScore = calculateRepositoryQualityScore(
      readme,
      packageJson,
      workflows,
      codeStructure,
      repository
    )
    
    return {
      readme,
      packageJson,
      workflows,
      codeStructure,
      qualityScore,
    }
  } catch (error) {
    console.error(`Error analyzing repository content for ${repository.name}:`, error)
    
    // Return minimal analysis on error
    return {
      readme: analyzeReadmeContent(null),
      packageJson: undefined,
      workflows: [],
      codeStructure: {
        fileCount: 0,
        directoryCount: 0,
        languageFiles: {},
        hasTests: false,
        testFrameworks: [],
        hasDocumentation: false,
        hasExamples: false,
        hasConfigFiles: false,
        organizationScore: 0,
      },
      qualityScore: {
        overall: 0,
        readme: 0,
        codeOrganization: 0,
        cicd: 0,
        documentation: 0,
        maintenance: 0,
        community: 0,
        breakdown: {
          readmeQuality: 0,
          hasCI: 0,
          hasTests: 0,
          hasLinting: 0,
          dependencyHealth: 0,
          communityFiles: 0,
          recentActivity: 0,
        },
      },
    }
  }
}

/**
 * Process GitHub account and collect comprehensive data
 * @param githubUrl - GitHub profile URL or username
 * @param options - Processing options
 * @returns Complete GitHub account data
 */
export async function processGitHubAccount(
  githubUrl: string,
  options: {
    maxRepos?: number
    includeOrganizations?: boolean
    analyzeContent?: boolean
    maxContentAnalysis?: number
  } = {}
): Promise<GitHubData> {
  try {
    const { 
      maxRepos = 100, 
      includeOrganizations = true, 
      analyzeContent = false, 
      maxContentAnalysis = 10 
    } = options
    
    console.log(`Processing GitHub account: ${githubUrl}`)
    
    // Extract username from URL
    const username = extractUsernameFromUrl(githubUrl)
    console.log(`Extracted username: ${username}`)
    
    // Get basic user information
    console.log('Fetching user information...')
    const userInfo = await getGitHubUserInfo(username)
    
    // Get user's repositories
    console.log('Fetching repositories...')
    const repositories = await getGitHubUserRepositories(username, maxRepos)
    
    // Analyze repository content (if requested)
    let repositoryContent: GitHubRepositoryContent[] | undefined
    if (analyzeContent && repositories.length > 0) {
      console.log('Analyzing repository content...')
      const reposToAnalyze = repositories
        .filter(repo => !repo.isFork) // Skip forks for content analysis
        .slice(0, maxContentAnalysis)
      
      repositoryContent = []
      
      for (const repo of reposToAnalyze) {
        try {
          const content = await analyzeRepositoryContent(repo)
          repositoryContent.push(content)
        } catch (error) {
          console.warn(`Failed to analyze repository ${repo.name}:`, error)
        }
      }
      
      console.log(`Analyzed ${repositoryContent.length} repositories`)
    }
    
    // Calculate language statistics
    console.log('Calculating language statistics...')
    const languageStats = calculateLanguageStats(repositories)
    
    // Get organizations (if requested)
    let organizations: GitHubOrganization[] = []
    if (includeOrganizations) {
      console.log('Fetching organizations...')
      organizations = await getGitHubUserOrganizations(username)
    }
    
    // Calculate contribution statistics
    console.log('Calculating contribution statistics...')
    const contributionStats = calculateContributionStats(repositories, userInfo, languageStats)
    
    // Calculate overall quality score (if content was analyzed)
    let overallQualityScore: GitHubQualityScore | undefined
    if (repositoryContent && repositoryContent.length > 0) {
      console.log('Calculating overall quality score...')
      
      // Average quality scores across analyzed repositories
      const avgScores = repositoryContent.reduce((acc, content) => {
        acc.overall += content.qualityScore.overall
        acc.readme += content.qualityScore.readme
        acc.codeOrganization += content.qualityScore.codeOrganization
        acc.cicd += content.qualityScore.cicd
        acc.documentation += content.qualityScore.documentation
        acc.maintenance += content.qualityScore.maintenance
        acc.community += content.qualityScore.community
        
        Object.keys(content.qualityScore.breakdown).forEach(key => {
          if (!acc.breakdown[key]) acc.breakdown[key] = 0
          acc.breakdown[key] += content.qualityScore.breakdown[key as keyof typeof content.qualityScore.breakdown]
        })
        
        return acc
      }, {
        overall: 0,
        readme: 0,
        codeOrganization: 0,
        cicd: 0,
        documentation: 0,
        maintenance: 0,
        community: 0,
        breakdown: {} as Record<string, number>
      })
      
      const count = repositoryContent.length
      overallQualityScore = {
        overall: Math.round(avgScores.overall / count),
        readme: Math.round(avgScores.readme / count),
        codeOrganization: Math.round(avgScores.codeOrganization / count),
        cicd: Math.round(avgScores.cicd / count),
        documentation: Math.round(avgScores.documentation / count),
        maintenance: Math.round(avgScores.maintenance / count),
        community: Math.round(avgScores.community / count),
        breakdown: Object.fromEntries(
          Object.entries(avgScores.breakdown).map(([key, value]) => [key, Math.round(value / count)])
        ) as any,
      }
    }
    
    // Count starred and forked repositories
    const starredRepos = repositories.reduce((sum, repo) => sum + repo.stars, 0)
    const forkedRepos = repositories.filter(repo => repo.isFork).length
    
    // Compile complete GitHub data
    const githubData: GitHubData = {
      username: userInfo.username || username,
      name: userInfo.name || '',
      bio: userInfo.bio || '',
      location: userInfo.location || '',
      email: userInfo.email || '',
      blog: userInfo.blog || '',
      company: userInfo.company || '',
      profileUrl: userInfo.profileUrl || `https://github.com/${username}`,
      avatarUrl: userInfo.avatarUrl || '',
      followers: userInfo.followers || 0,
      following: userInfo.following || 0,
      publicRepos: userInfo.publicRepos || 0,
      publicGists: userInfo.publicGists || 0,
      accountCreationDate: userInfo.accountCreationDate || '',
      lastActivityDate: userInfo.lastActivityDate,
      repositories,
      repositoryContent,
      languages: languageStats,
      contributions: contributionStats,
      starredRepos,
      forkedRepos,
      organizations,
      overallQualityScore,
      other: {
        processingDate: new Date().toISOString(),
        apiVersion: 'v3',
        processingOptions: options,
        contentAnalysisEnabled: !!analyzeContent,
        repositoriesAnalyzed: repositoryContent?.length || 0,
      },
    }
    
    console.log('GitHub account processing completed successfully')
    return githubData
    
  } catch (error) {
    console.error('Error processing GitHub account:', error)
    throw new Error(`Failed to process GitHub account: ${error}`)
  }
}

/**
 * Validate and clean GitHub data
 * @param githubData - Raw GitHub data to validate
 * @returns Validated and cleaned GitHub data
 */
export function validateAndCleanGitHubData(githubData: Partial<GitHubData>): GitHubData {
  const cleanData: GitHubData = {
    username: githubData.username || '',
    name: githubData.name || '',
    bio: githubData.bio || '',
    location: githubData.location || '',
    email: githubData.email || '',
    blog: githubData.blog || '',
    company: githubData.company || '',
    profileUrl: githubData.profileUrl || '',
    avatarUrl: githubData.avatarUrl || '',
    followers: githubData.followers || 0,
    following: githubData.following || 0,
    publicRepos: githubData.publicRepos || 0,
    publicGists: githubData.publicGists || 0,
    accountCreationDate: githubData.accountCreationDate || '',
    lastActivityDate: githubData.lastActivityDate,
    repositories: githubData.repositories || [],
    repositoryContent: githubData.repositoryContent,
    languages: githubData.languages || [],
    contributions: githubData.contributions || {
      totalCommits: 0,
      totalPullRequests: 0,
      totalIssues: 0,
      totalRepositories: 0,
      streakDays: 0,
      contributionsLastYear: 0,
      mostActiveDay: '',
      mostUsedLanguage: '',
    },
    activityAnalysis: githubData.activityAnalysis,
    starredRepos: githubData.starredRepos || 0,
    forkedRepos: githubData.forkedRepos || 0,
    organizations: githubData.organizations || [],
    overallQualityScore: githubData.overallQualityScore,
    other: githubData.other || {},
  }
  
  // Validate email format if provided
  if (cleanData.email && !isValidEmail(cleanData.email)) {
    console.warn(`Invalid email format: ${cleanData.email}`)
  }
  
  // Validate URLs
  if (cleanData.profileUrl && !isValidUrl(cleanData.profileUrl)) {
    console.warn(`Invalid profile URL: ${cleanData.profileUrl}`)
  }
  
  if (cleanData.blog && !isValidUrl(cleanData.blog)) {
    console.warn(`Invalid blog URL: ${cleanData.blog}`)
  }
  
  return cleanData
}

/**
 * Utility function to validate email format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Utility function to validate URL format
 * @param url - URL string to validate
 * @returns True if valid URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Save GitHub data to JSON file
 * @param githubData - GitHub data to save
 * @param outputPath - Path to save the JSON file
 */
export function saveGitHubDataToJson(githubData: GitHubData, outputPath: string): void {
  try {
    // Ensure the directory exists
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    const jsonData = JSON.stringify(githubData, null, 2)
    fs.writeFileSync(outputPath, jsonData, 'utf8')
    console.log(`GitHub data saved to: ${outputPath}`)
  } catch (error) {
    console.error('Error saving GitHub data:', error)
    throw new Error(`Failed to save GitHub data: ${error}`)
  }
} 