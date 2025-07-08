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
  GitHubQualityScore,
  GitHubActivityAnalysis,
  GitHubCommitFrequency,
  GitHubIssueMetrics,
  GitHubPullRequestMetrics,
  GitHubCollaborationSignals
} from './interfaces/github'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GitHub API configuration
 */
const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

/**
 * API usage tracking
 */
let apiUsageTracker: {
  totalCalls: number
  callsByCategory: Record<string, number>
  rateLimitInfo: {
    remaining: number | null
    reset: string | null
  }
} = {
  totalCalls: 0,
  callsByCategory: {},
  rateLimitInfo: {
    remaining: null,
    reset: null
  }
}

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
 * Categorize API endpoint for usage tracking
 * @param endpoint - API endpoint
 * @returns Category name
 */
function categorizeApiCall(endpoint: string): string {
  if (endpoint.includes('/users/') && endpoint.includes('/repos')) return 'repositories'
  if (endpoint.includes('/users/') && endpoint.includes('/orgs')) return 'organizations'
  if (endpoint.includes('/users/') && endpoint.includes('/events')) return 'events'
  if (endpoint.includes('/users/') && !endpoint.includes('/')) return 'user-info'
  if (endpoint.includes('/repos/') && endpoint.includes('/contents')) return 'repository-content'
  if (endpoint.includes('/repos/') && endpoint.includes('/contributors')) return 'contributors'
  if (endpoint.includes('/repos/') && endpoint.includes('/issues')) return 'issues'
  if (endpoint.includes('/repos/') && endpoint.includes('/protection')) return 'branch-protection'
  if (endpoint.includes('/repos/') && endpoint.includes('/community')) return 'community'
  if (endpoint.includes('/orgs/')) return 'organization-details'
  return 'other'
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
    
    // Track API usage
    apiUsageTracker.totalCalls++
    const category = categorizeApiCall(endpoint)
    apiUsageTracker.callsByCategory[category] = (apiUsageTracker.callsByCategory[category] || 0) + 1
    
    // Update rate limit info
    const remaining = response.headers.get('x-ratelimit-remaining')
    const reset = response.headers.get('x-ratelimit-reset')
    if (remaining) apiUsageTracker.rateLimitInfo.remaining = parseInt(remaining)
    if (reset) apiUsageTracker.rateLimitInfo.reset = new Date(parseInt(reset) * 1000).toISOString()
    
    if (!response.ok) {
      if (response.status === 404) {
        // Different 404 error messages based on endpoint type
        if (endpoint.includes('/users/')) {
          throw new Error(`GitHub user '${username || 'unknown'}' not found`)
        } else if (endpoint.includes('/contents/')) {
          throw new Error(`Resource not found: ${endpoint} (this is normal - resource doesn't exist)`)
        } else if (endpoint.includes('/protection')) {
          throw new Error(`Branch protection not found: ${endpoint} (this is normal - no protection configured)`)
        } else {
          throw new Error(`Resource not found: ${endpoint}`)
        }
              } else if (response.status === 403) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      } else {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }
    }

    return await response.json()
  } catch (error: any) {
    // Only log non-404 errors or 404s that aren't "normal" missing resources
    if (!error.message?.includes('Resource not found') &&
        !error.message?.includes('Branch protection not found')) {
      console.error(`Error fetching ${endpoint}:`, error)
    }
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
        const detailedOrg = await fetchGitHubApi(`/orgs/${org.login}`, username)

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
      } catch {
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
 * Get user's recent activity events for contribution analysis
 * @param username - GitHub username
 * @param maxEvents - Maximum number of events to fetch (default: 300)
 * @returns Array of user events
 */
async function getGitHubUserEvents(username: string, maxEvents: number = 300): Promise<any[]> {
  try {
    const events: any[] = []
    let page = 1
    const perPage = Math.min(maxEvents, 100)

    while (events.length < maxEvents) {
      const eventData = await fetchGitHubApi(
        `/users/${username}/events?page=${page}&per_page=${perPage}`,
        username
      )

      if (!eventData || eventData.length === 0) {
        break
      }

      events.push(...eventData)
      page++

      // Break if we got less than perPage results (last page)
      if (eventData.length < perPage) {
        break
      }
    }

    return events.slice(0, maxEvents)
  } catch (error) {
    console.warn('Error fetching user events:', error)
    return []
  }
}

/**
 * Analyze commit frequency and patterns from user events
 * @param events - User's GitHub events
 * @returns Commit frequency analysis
 */
function analyzeCommitFrequency(events: any[]): GitHubCommitFrequency {
  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    // Filter push events (commits)
    const pushEvents = events.filter(event => event.type === 'PushEvent')

    // Count commits in different time periods
    const lastWeek = pushEvents.filter(event =>
      new Date(event.created_at) > oneWeekAgo
    ).reduce((sum, event) => sum + (event.payload?.commits?.length || 0), 0)

    const lastMonth = pushEvents.filter(event =>
      new Date(event.created_at) > oneMonthAgo
    ).reduce((sum, event) => sum + (event.payload?.commits?.length || 0), 0)

    const lastYear = pushEvents.filter(event =>
      new Date(event.created_at) > oneYearAgo
    ).reduce((sum, event) => sum + (event.payload?.commits?.length || 0), 0)

    // Calculate average per week over the year
    const averagePerWeek = Math.round(lastYear / 52)

    // Analyze commit message quality
    const commitMessages = pushEvents
      .flatMap(event => event.payload?.commits || [])
      .map(commit => commit.message)
      .filter(Boolean)

    let commitMessageQuality = 50 // Default score
    let conventionalCommits = false

    if (commitMessages.length > 0) {
      // Check for conventional commit patterns
      const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?: .+/
      const conventionalCount = commitMessages.filter(msg => conventionalPattern.test(msg)).length
      conventionalCommits = conventionalCount / commitMessages.length > 0.5

      // Calculate message quality score
      const avgLength = commitMessages.reduce((sum, msg) => sum + msg.length, 0) / commitMessages.length
      const hasDescriptive = commitMessages.filter(msg => msg.length > 20).length / commitMessages.length

      commitMessageQuality = Math.min(100, Math.round(
        (avgLength > 20 ? 30 : avgLength / 20 * 30) +
        (hasDescriptive * 40) +
        (conventionalCommits ? 30 : 0)
      ))
    }

    return {
      lastWeek,
      lastMonth,
      lastYear,
      averagePerWeek,
      commitMessageQuality,
      conventionalCommits,
    }
  } catch (error) {
    console.error('Error analyzing commit frequency:', error)
    return {
      lastWeek: 0,
      lastMonth: 0,
      lastYear: 0,
      averagePerWeek: 0,
      commitMessageQuality: 0,
      conventionalCommits: false,
    }
  }
}

/**
 * Get detailed repository statistics including issues and PRs
 * @param username - GitHub username
 * @param repositories - User's repositories
 * @returns Issue and PR metrics
 */
async function getRepositoryStats(username: string, repositories: GitHubRepository[]): Promise<{
  issueMetrics: GitHubIssueMetrics
  pullRequestMetrics: GitHubPullRequestMetrics
}> {
  try {
    let totalOpenIssues = 0
    let totalClosedIssues = 0
    let totalOpenPRs = 0
    let totalMergedPRs = 0
    let hasTemplates = false
    let requiresReviews = false
    let hasLabels = false

    // Sample a few repositories for detailed analysis (to avoid rate limits)
    const samplesToAnalyze = repositories.filter(repo => !repo.isFork).slice(0, 5)

    for (const repo of samplesToAnalyze) {
      try {
        // Get issues (includes PRs in GitHub API)
        const issues = await fetchGitHubApi(`/repos/${repo.fullName}/issues?state=all&per_page=100`, username)
        const pullRequests = issues.filter((issue: any) => issue.pull_request)
        const pureIssues = issues.filter((issue: any) => !issue.pull_request)

        // Count issues
        totalOpenIssues += pureIssues.filter((issue: any) => issue.state === 'open').length
        totalClosedIssues += pureIssues.filter((issue: any) => issue.state === 'closed').length

        // Count PRs
        totalOpenPRs += pullRequests.filter((pr: any) => pr.state === 'open').length
        totalMergedPRs += pullRequests.filter((pr: any) => pr.state === 'closed').length

        // Check for labels
        if (issues.some((issue: any) => issue.labels && issue.labels.length > 0)) {
          hasLabels = true
        }

        // Check for issue/PR templates
        try {
          const templates = await fetchGitHubApi(`/repos/${repo.fullName}/contents/.github`, username)
          if (templates && Array.isArray(templates)) {
            const templateFiles = templates.filter((file: any) =>
              file.name.includes('template') ||
              file.name.includes('TEMPLATE') ||
              file.name === 'PULL_REQUEST_TEMPLATE.md' ||
              file.name === 'ISSUE_TEMPLATE.md'
            )
            if (templateFiles.length > 0) {
              hasTemplates = true
            }
          }
        } catch (error: any) {
          // 404 is normal (no .github directory), but log other errors
          if (!error.message?.includes('Resource not found')) {
            console.warn(`Unexpected error checking templates for ${repo.name}:`, error.message)
          }
        }

        // Check branch protection (indicates review requirements)
        try {
          const branch = await fetchGitHubApi(`/repos/${repo.fullName}/branches/${repo.defaultBranch}/protection`, username)
          if (branch && branch.required_pull_request_reviews) {
            requiresReviews = true
          }
        } catch (error: any) {
          // 404 is normal (no branch protection), but log other errors
          if (!error.message?.includes('Branch protection not found')) {
            console.warn(`Unexpected error checking branch protection for ${repo.name}:`, error.message)
          }
        }

      } catch (error) {
        console.warn(`Failed to analyze repository ${repo.name}:`, error)
      }
    }

    const issueMetrics: GitHubIssueMetrics = {
      totalOpen: totalOpenIssues,
      totalClosed: totalClosedIssues,
      averageResponseTime: 0, // Would need detailed timeline analysis
      averageResolutionTime: 0, // Would need detailed timeline analysis
      hasLabels,
      hasTemplates,
      maintainerResponseRate: 0, // Would need comment analysis
    }

    const pullRequestMetrics: GitHubPullRequestMetrics = {
      totalOpen: totalOpenPRs,
      totalMerged: totalMergedPRs,
      averageReviewTime: 0, // Would need detailed PR timeline analysis
      averageMergeTime: 0, // Would need detailed PR timeline analysis
      hasTemplates,
      requiresReviews,
      maintainerMergeRate: totalMergedPRs > 0 ? Math.round((totalMergedPRs / (totalMergedPRs + totalOpenPRs)) * 100) : 0,
    }

    return { issueMetrics, pullRequestMetrics }
  } catch (error) {
    console.error('Error getting repository stats:', error)
    return {
      issueMetrics: {
        totalOpen: 0,
        totalClosed: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        hasLabels: false,
        hasTemplates: false,
        maintainerResponseRate: 0,
      },
      pullRequestMetrics: {
        totalOpen: 0,
        totalMerged: 0,
        averageReviewTime: 0,
        averageMergeTime: 0,
        hasTemplates: false,
        requiresReviews: false,
        maintainerMergeRate: 0,
      }
    }
  }
}

/**
 * Analyze collaboration signals from repositories and events
 * @param username - GitHub username
 * @param repositories - User's repositories
 * @param events - User's GitHub events
 * @returns Collaboration analysis
 */
async function analyzeCollaborationSignals(
  username: string,
  repositories: GitHubRepository[],
  events: any[]
): Promise<GitHubCollaborationSignals> {
  try {
    const uniqueContributors = new Set<string>()
    let outsideContributions = 0
    let hasCodeOfConduct = false
    let hasContributingGuide = false
    let hasSecurityPolicy = false

    // Analyze contributions to other repositories
    const contributionEvents = events.filter(event =>
      event.type === 'PullRequestEvent' ||
      event.type === 'IssuesEvent' ||
      event.type === 'PullRequestReviewEvent'
    )

    outsideContributions = contributionEvents.filter(event => {
      const repoOwner = event.repo?.name?.split('/')[0]
      return repoOwner && repoOwner !== username
    }).length

    // Sample repositories for contributor analysis
    const samplesToAnalyze = repositories.filter(repo => !repo.isFork && repo.stars > 0).slice(0, 3)

    for (const repo of samplesToAnalyze) {
      try {
        // Get contributors
        const contributors = await fetchGitHubApi(`/repos/${repo.fullName}/contributors?per_page=100`, username)
        if (contributors && Array.isArray(contributors)) {
          contributors.forEach((contributor: any) => {
            if (contributor.login !== username) {
              uniqueContributors.add(contributor.login)
            }
          })
        }

        // Check for community files
        try {
          const communityFiles = await fetchGitHubApi(`/repos/${repo.fullName}/community/profile`, username)
          if (communityFiles) {
            if (communityFiles.files?.code_of_conduct) hasCodeOfConduct = true
            if (communityFiles.files?.contributing) hasContributingGuide = true
            if (communityFiles.files?.security) hasSecurityPolicy = true
          }
        } catch (error: any) {
          // Community profile not available (this is normal for many repos)
          if (!error.message?.includes('Resource not found')) {
            console.warn(`Unexpected error checking community profile for ${repo.name}:`, error.message)
          }
        }
      } catch (error) {
        console.warn(`Failed to analyze collaboration for ${repo.name}:`, error)
      }
    }

    // Calculate metrics
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stars, 0)
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks, 0)
    const forkToStarRatio = totalStars > 0 ? totalForks / totalStars : 0

    // Calculate community engagement score
    const engagementFactors = [
      outsideContributions > 10 ? 1 : outsideContributions / 10,
      uniqueContributors.size > 5 ? 1 : uniqueContributors.size / 5,
      forkToStarRatio > 0.1 ? 1 : forkToStarRatio * 10,
      hasCodeOfConduct ? 1 : 0,
      hasContributingGuide ? 1 : 0,
    ]

    const communityEngagement = Math.round(
      (engagementFactors.reduce((sum, factor) => sum + factor, 0) / engagementFactors.length) * 100
    )

    return {
      uniqueContributors: uniqueContributors.size,
      coreTeamSize: Math.min(5, uniqueContributors.size), // Estimate core team
      outsideContributions,
      forkToStarRatio: Math.round(forkToStarRatio * 100) / 100,
      communityEngagement,
      hasCodeOfConduct,
      hasContributingGuide,
      hasSecurityPolicy,
    }
  } catch (error) {
    console.error('Error analyzing collaboration signals:', error)
    return {
      uniqueContributors: 0,
      coreTeamSize: 0,
      outsideContributions: 0,
      forkToStarRatio: 0,
      communityEngagement: 0,
      hasCodeOfConduct: false,
      hasContributingGuide: false,
      hasSecurityPolicy: false,
    }
  }
}

/**
 * Enhanced framework detection from package.json and file structure
 * @param packageJson - Parsed package.json content
 * @param repoStructure - Repository file structure
 * @returns Enhanced package analysis with framework detection
 */
function enhancedPackageAnalysis(packageJson: any): GitHubPackageAnalysis {
  if (!packageJson) {
    return {
      exists: false,
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

  const dependencies = packageJson.dependencies || {}
  const devDependencies = packageJson.devDependencies || {}
  const scripts = packageJson.scripts || {}
  const allDeps = { ...dependencies, ...devDependencies }

  // Enhanced framework detection
  const frameworks = {
    react: ['react', '@types/react', 'react-dom'],
    vue: ['vue', '@vue/cli', 'vue-router', 'vuex'],
    angular: ['@angular/core', '@angular/cli', 'angular'],
    express: ['express', 'fastify', 'koa'],
    nestjs: ['@nestjs/core', '@nestjs/common'],
    nextjs: ['next'],
    nuxt: ['nuxt'],
    svelte: ['svelte', 'sveltekit'],
    gatsby: ['gatsby'],
    flutter: ['flutter'],
    django: ['django'],
    rails: ['rails'],
  }

  const detectedFrameworks: string[] = []
  Object.entries(frameworks).forEach(([framework, packages]) => {
    if (packages.some(pkg => allDeps[pkg])) {
      detectedFrameworks.push(framework)
    }
  })

  // Enhanced tooling detection
  const lintingTools = ['eslint', 'tslint', 'jshint', 'prettier', 'stylelint']
  const testingTools = ['jest', 'mocha', 'jasmine', 'karma', 'cypress', 'playwright', 'vitest']
  const buildTools = ['webpack', 'rollup', 'parcel', 'vite', 'esbuild']

  const hasLinting = lintingTools.some(tool => allDeps[tool]) ||
                    Object.keys(scripts).some(script => script.includes('lint'))

  const hasTesting = testingTools.some(tool => allDeps[tool]) ||
                     Object.keys(scripts).some(script => script.includes('test'))

  const hasTypeScript = !!allDeps['typescript'] || !!allDeps['@types/node']

  return {
    exists: true,
    hasScripts: Object.keys(scripts).length > 0,
    scriptCount: Object.keys(scripts).length,
    dependencyCount: Object.keys(dependencies).length,
    devDependencyCount: Object.keys(devDependencies).length,
    hasLinting,
    hasTesting,
    hasTypeScript,
    hasDocumentation: !!scripts.docs || !!allDeps['typedoc'] || !!allDeps['jsdoc'],
    hasValidLicense: !!packageJson.license,
    frameworks: detectedFrameworks,
    buildTools: buildTools.filter(tool => allDeps[tool]),
    testingFrameworks: testingTools.filter(tool => allDeps[tool]),
    lintingTools: lintingTools.filter(tool => allDeps[tool]),
  } as any
}

/**
 * Calculate contribution statistics with enhanced activity analysis
 * @param repositories - User's repositories
 * @param userInfo - Basic user information
 * @param languageStats - Language statistics
 * @param events - User's GitHub events
 * @returns Enhanced contribution statistics
 */
export function calculateContributionStats(
  repositories: GitHubRepository[],
  userInfo: Partial<GitHubData>,
  languageStats: GitHubLanguageStats[],
  events?: any[]
): GitHubContributionStats {
  try {
    const totalRepositories = repositories.length
    const mostUsedLanguage = languageStats.length > 0 ? languageStats[0].language : ''

    // Enhanced calculations with events data
    let totalCommits = 0
    let totalPullRequests = 0
    let totalIssues = 0
    let streakDays = 0
    let contributionsLastYear = 0
    let mostActiveDay = ''

    if (events && events.length > 0) {
      // Calculate commits from push events
      totalCommits = events
        .filter(event => event.type === 'PushEvent')
        .reduce((sum, event) => sum + (event.payload?.commits?.length || 0), 0)

      // Calculate PRs and issues
      totalPullRequests = events.filter(event => event.type === 'PullRequestEvent').length
      totalIssues = events.filter(event => event.type === 'IssuesEvent').length

      // Calculate contribution streak
      const contributionDates = events.map(event =>
        new Date(event.created_at).toDateString()
      ).filter((date, index, array) => array.indexOf(date) === index)

      contributionDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

      // Calculate current streak
      let currentStreak = 0

      for (let i = 0; i < contributionDates.length; i++) {
        const date = new Date(contributionDates[i])
        const expectedDate = new Date()
        expectedDate.setDate(expectedDate.getDate() - i)

        if (date.toDateString() === expectedDate.toDateString() ||
            (i === 0 && date.toDateString() === new Date(Date.now() - 24*60*60*1000).toDateString())) {
          currentStreak++
        } else {
          break
        }
      }

      streakDays = currentStreak

      // Calculate contributions in last year
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      contributionsLastYear = events.filter(event =>
        new Date(event.created_at) > oneYearAgo
      ).length

      // Find most active day of week
      const dayCount: Record<string, number> = {}
      events.forEach(event => {
        const day = new Date(event.created_at).toLocaleDateString('en-US', { weekday: 'long' })
        dayCount[day] = (dayCount[day] || 0) + 1
      })

      mostActiveDay = Object.entries(dayCount).reduce((a, b) =>
        dayCount[a[0]] > dayCount[b[0]] ? a : b
      )?.[0] || ''
    }

    return {
      totalCommits,
      totalPullRequests,
      totalIssues,
      totalRepositories,
      streakDays,
      contributionsLastYear,
      mostActiveDay,
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
    const response = await fetchGitHubApi(`/repos/${username}/${repoName}/contents/${filePath}`, username)

    if (response.type === 'file' && response.content) {
      // GitHub API returns base64 encoded content
      return atob(response.content)
    }

    return null
  } catch (error: any) {
    // Don't log 404s as they're expected for missing files
    if (!error.message?.includes('Resource not found')) {
      console.warn(`Unexpected error getting file content for ${username}/${repoName}/${filePath}:`, error.message)
    }
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
    const response = await fetchGitHubApi(`/repos/${username}/${repoName}/contents/${dirPath}`, username)
    return Array.isArray(response) ? response : []
  } catch (error: any) {
    // Don't log 404s as they're expected for missing directories
    if (!error.message?.includes('Resource not found')) {
      console.warn(`Unexpected error getting directory contents for ${username}/${repoName}/${dirPath}:`, error.message)
    }
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

    // If no workflows directory exists, return empty array (this is normal)
    if (workflowsDir.length === 0) {
      return workflows
    }

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
 * Analyze repository code structure from already-fetched root contents
 * @param rootContents - Already-fetched root directory contents
 * @returns Code structure analysis
 */
function analyzeCodeStructureFromContents(rootContents: any[]): GitHubCodeStructure {
  try {
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
        const ext = item.name.includes('.') ? '.' + item.name.split('.').pop()?.toLowerCase() : ''
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
    console.warn('Failed to analyze code structure from contents:', error)
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
    
    // Get root directory contents once (shared between README and code structure analysis)
    const rootContents = await getRepositoryDirectoryContents(owner, repoName, '')
    
    // Smart README detection - find README file from directory listing
    const readmeFile = rootContents.find(file => 
      file.type === 'file' && /^readme\.(md|rst|txt)$/i.test(file.name)
    )
    
    // Only fetch README content if file exists (saves 3 API calls per repo)
    const readmeContent = readmeFile ? 
      await getRepositoryFileContent(owner, repoName, readmeFile.name) : null
    
    const readme = analyzeReadmeContent(readmeContent)
    
    // Smart package.json detection - check if it exists before fetching
    const hasPackageJson = rootContents.some(file => 
      file.type === 'file' && file.name === 'package.json'
    )
    
    const packageContent = hasPackageJson ? 
      await getRepositoryFileContent(owner, repoName, 'package.json') : null
    const packageJson = packageContent ? 
      enhancedPackageAnalysis(JSON.parse(packageContent)) : 
      undefined

    // Analyze workflows
    const workflows = await analyzeGitHubWorkflows(owner, repoName)
    
    // Analyze code structure using the already-fetched root contents
    const codeStructure = await analyzeCodeStructureFromContents(rootContents)
    
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
    includeActivity?: boolean
  } = {}
): Promise<GitHubData> {
  try {
    // Reset API usage tracker at start
    apiUsageTracker = {
      totalCalls: 0,
      callsByCategory: {},
      rateLimitInfo: {
        remaining: null,
        reset: null
      }
    }
    const { 
      maxRepos = 100, 
      includeOrganizations = true, 
      analyzeContent = false, 
      maxContentAnalysis = 10,
      includeActivity = true
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

    // Get user activity events for enhanced analysis
    let userEvents: any[] = []
    let activityAnalysis: GitHubActivityAnalysis | undefined
    if (includeActivity) {
      console.log('Fetching user activity events...')
      userEvents = await getGitHubUserEvents(username)

      console.log('Analyzing activity patterns...')
      // Analyze commit frequency and patterns
      const commitFrequency = analyzeCommitFrequency(userEvents)

      // Get detailed repository statistics
      const { issueMetrics, pullRequestMetrics } = await getRepositoryStats(username, repositories)

      // Analyze collaboration signals
      const collaborationSignals = await analyzeCollaborationSignals(username, repositories, userEvents)

      activityAnalysis = {
        commitFrequency,
        issueMetrics,
        pullRequestMetrics,
        collaborationSignals,
      }

      console.log('Activity analysis completed')
    }

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

    // Calculate enhanced contribution statistics
    console.log('Calculating contribution statistics...')
    const contributionStats = calculateContributionStats(repositories, userInfo, languageStats, userEvents)
    
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
      activityAnalysis,
      starredRepos,
      forkedRepos,
      organizations,
      other: {
        processingDate: new Date().toISOString(),
        apiVersion: 'v3',
        processingOptions: options,
        contentAnalysisEnabled: !!analyzeContent,
        activityAnalysisEnabled: !!includeActivity,
        repositoriesAnalyzed: repositoryContent?.length || 0,
        eventsAnalyzed: userEvents.length,
      },
    }

    console.log('GitHub account processing completed successfully')
    
    // Log API usage summary
    console.log('\n=== GitHub API Usage Summary ===')
    console.log(`Total API calls made: ${apiUsageTracker.totalCalls}`)
    console.log('Calls by category:')
    Object.entries(apiUsageTracker.callsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} calls`)
    })
    if (apiUsageTracker.rateLimitInfo.remaining !== null) {
      console.log(`Rate limit remaining: ${apiUsageTracker.rateLimitInfo.remaining}`)
    }
    if (apiUsageTracker.rateLimitInfo.reset) {
      console.log(`Rate limit resets at: ${apiUsageTracker.rateLimitInfo.reset}`)
    }
    console.log('================================\n')
    
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
    other: githubData.other || {},
  }
  
  return cleanData
}
