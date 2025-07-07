import { GitHubData, GitHubRepository, GitHubLanguageStats, GitHubContributionStats, GitHubOrganization } from '../interfaces'
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
  } = {}
): Promise<GitHubData> {
  try {
    const { maxRepos = 100, includeOrganizations = true } = options
    
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
      languages: languageStats,
      contributions: contributionStats,
      starredRepos,
      forkedRepos,
      organizations,
      other: {
        processingDate: new Date().toISOString(),
        apiVersion: 'v3',
        processingOptions: options,
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
    starredRepos: githubData.starredRepos || 0,
    forkedRepos: githubData.forkedRepos || 0,
    organizations: githubData.organizations || [],
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