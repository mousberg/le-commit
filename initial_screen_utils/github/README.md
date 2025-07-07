# GitHub Account Analyzer

This module provides functionality to collect and analyze GitHub account information using the GitHub API.

## Features

- Extract comprehensive account information from GitHub usernames or profile URLs
- Collect repository data including languages, stars, forks, and metadata
- **🆕 Analyze repository content** (README quality, CI/CD setup, code structure)
- **🆕 Calculate quality scores** for repositories and overall account
- **🆕 Detect development practices** (testing, linting, documentation)
- **🆕 Enhanced framework detection** (React, Vue, Angular, Express, etc.)
- **🆕 Contribution calendar & streak analysis** with real activity data
- **🆕 Detailed PR tracking** (review requirements, templates, merge rates)
- **🆕 Collaboration signals** (contributors, community files, engagement)
- **🆕 Commit quality analysis** (conventional commits, message quality)
- Calculate programming language statistics
- Gather organization memberships
- Generate contribution statistics
- Save data to JSON format for further analysis

## Setup

### Environment Variables

#### Required
None - the module works with GitHub's public API.

#### Optional
- `GITHUB_TOKEN` - GitHub Personal Access Token for higher rate limits and access to private data
  ```bash
  export GITHUB_TOKEN="your-github-token-here"
  ```

### Dependencies

The module requires the following dependencies (already included in package.json):
- Node.js built-in modules: `fs`, `path`
- Fetch API (built into modern Node.js versions)

## Usage

### Basic Usage

```typescript
import { processGitHubAccount, saveGitHubDataToJson } from './github/github'

async function analyzeAccount() {
  try {
    // Process a GitHub account with content analysis
    const githubData = await processGitHubAccount('octocat', {
      maxRepos: 50,
      includeOrganizations: true,
      analyzeContent: true,        // 🆕 Enable deep content analysis
      maxContentAnalysis: 10       // 🆕 Analyze top 10 repositories
    })
    
    // Save the data
    saveGitHubDataToJson(githubData, './output/github-data.json')
    
    console.log(`Analyzed ${githubData.repositories.length} repositories`)
    console.log(`Top language: ${githubData.languages[0]?.language}`)
    
    // 🆕 Display quality scores
    if (githubData.overallQualityScore) {
      console.log(`Overall Quality Score: ${githubData.overallQualityScore.overall}/100`)
      console.log(`README Quality: ${githubData.overallQualityScore.readme}/100`)
      console.log(`CI/CD Maturity: ${githubData.overallQualityScore.cicd}/100`)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
```

### URL Formats Supported

The module accepts various GitHub URL formats:
- Username only: `octocat`
- Full profile URL: `https://github.com/octocat`
- Profile URL with trailing slash: `https://github.com/octocat/`

### Processing Options

```typescript
const options = {
  maxRepos: 100,              // Maximum repositories to analyze (default: 100)
  includeOrganizations: true, // Include organization data (default: true)
  analyzeContent: true,       // 🆕 Enable repository content analysis (default: false)
  maxContentAnalysis: 10,     // 🆕 Maximum repositories to analyze in detail (default: 10)
  includeActivity: true       // 🆕 Enable enhanced activity analysis (default: true)
}

const githubData = await processGitHubAccount('username', options)
```

### 🚀 Enhanced Features

#### Contribution Calendar & Streak Analysis
- **Real Activity Data**: Fetches actual GitHub events for accurate contribution tracking
- **Streak Calculation**: Calculates current contribution streaks based on daily activity
- **Activity Patterns**: Identifies most active days and contribution patterns

#### Advanced Framework Detection
- **Smart Detection**: Identifies frameworks from package.json dependencies and file structure
- **Comprehensive Coverage**: Detects React, Vue, Angular, Express, Next.js, and many more
- **Tooling Analysis**: Identifies build tools, testing frameworks, and linting tools

#### Detailed PR & Issue Tracking
- **PR Quality Metrics**: Analyzes merge rates, review requirements, and templates
- **Issue Management**: Tracks issue resolution patterns and template usage
- **Repository Governance**: Detects branch protection and review requirements

#### Collaboration Analysis
- **Community Engagement**: Measures contributions to other projects and community involvement
- **Contributor Networks**: Analyzes unique contributors and collaboration patterns
- **Community Health**: Detects code of conduct, contributing guides, and security policies

## Data Structure

The module returns a comprehensive `GitHubData` object containing:

### User Information
- Basic profile data (name, bio, location, etc.)
- Follower/following counts
- Account creation date
- Contact information (email, website, company)

### Repository Data
- Repository metadata (name, description, language)
- Statistics (stars, forks, watchers, size)
- Configuration (private/public, features enabled)
- Timestamps (created, updated)

### Language Statistics
- Programming languages used across repositories
- Percentage breakdown of code by language
- Byte counts for each language

### Organizations
- Organization memberships
- Organization metadata and statistics

### Contribution Statistics
- Repository counts and activity metrics
- Most used programming language
- Recent activity indicators

### 🆕 Repository Content Analysis
- **README Quality**: Length, sections, badges, documentation completeness
- **Package.json Analysis**: Scripts, dependencies, tooling setup
- **GitHub Workflows**: CI/CD pipeline analysis and complexity scoring
- **Code Structure**: File organization, test presence, documentation folders

### 🆕 Quality Scoring (0-100 scale)
- **Overall Score**: Weighted average across all quality dimensions
- **README Quality**: Documentation completeness and helpfulness
- **Code Organization**: Project structure and file organization
- **CI/CD Maturity**: Automated workflow sophistication
- **Documentation**: Presence of docs, examples, and guides
- **Maintenance**: Recent activity and dependency health
- **Community**: Contributing guidelines, licenses, and engagement

## Examples

### Run Example Scripts

```bash
# Default example - processes multiple accounts
node example.ts

# Process a single account with detailed output
node example.ts single mousberg

# Compare multiple accounts
node example.ts compare octocat torvalds gaearon
```

### Example Output

```
=== GitHub Account Summary ===
Username: octocat
Name: The Octocat
Bio: GitHub's mascot
Location: San Francisco
Followers: 8549
Following: 9
Public Repos: 8
Top Programming Languages:
  1. C: 52.3%
  2. Assembly: 47.7%
Most Recently Updated Repositories:
  1. Hello-World (C) - Updated: 12/1/2023
     ⭐ 2156 | 🍴 1067 | 👁️ 97

🏆 Overall Quality Score: 78/100
Quality Breakdown:
  📖 README Quality: 85/100
  🏗️  Code Organization: 72/100
  🚀 CI/CD: 45/100
  📚 Documentation: 80/100
  🔧 Maintenance: 90/100
  👥 Community: 65/100

🎯 Contribution Calendar & Streaks:
  Current Streak: 15 days
  Total Commits: 1,247
  Total Pull Requests: 89
  Total Issues Opened: 156
  Most Active Day: Tuesday
  Contributions This Year: 892

⚡ Enhanced Activity Analysis:

  📝 Commit Patterns & Quality:
     Last Week: 12 commits
     Last Month: 48 commits
     Last Year: 520 commits
     Weekly Average: 10 commits
     Commit Message Quality: 85/100
     Conventional Commits: ✅

  🔄 Pull Request Quality:
     Open PRs: 3
     Merged PRs: 86
     Requires Reviews: ✅
     Has PR Templates: ✅
     Maintainer Merge Rate: 96%

  🤝 Collaboration & Community:
     Unique Contributors: 23
     Outside Contributions: 42
     Fork-to-Star Ratio: 0.15
     Community Engagement Score: 78/100
     Code of Conduct: ✅
     Contributing Guide: ✅
     Security Policy: ❌

📊 Repository Content Analysis (5 repos):
  1. Hello-World (Quality: 82/100)
     📝 README: ✅ (85/100)
     🔨 CI/CD: ❌
     🧪 Tests: ❌
     📦 Package.json: ❌
     - Frameworks: React, Express
     - Linting: ✅ (eslint, prettier)
     - Testing: ✅ (jest, cypress)
     - TypeScript: ✅
     - Build Tools: webpack, vite
```

## API Rate Limits

### Without Authentication
- 60 requests per hour per IP address
- Sufficient for analyzing small accounts or testing

### With GitHub Token
- 5,000 requests per hour per authenticated user
- Recommended for production use or analyzing large accounts

### Rate Limit Best Practices
- Set `GITHUB_TOKEN` environment variable for better limits
- Use `maxRepos` option to limit data collection
- Implement delays between API calls for large batch operations

## Error Handling

The module handles common GitHub API errors:
- **404 Not Found**: User or repository doesn't exist
- **403 Forbidden**: Rate limit exceeded or insufficient permissions
- **Network errors**: Connection issues or API downtime

## Integration with Other Modules

This module follows the same patterns as the CV processing module:
- Similar function naming conventions
- Consistent data structure patterns
- Compatible file output formats
- Shared interfaces in `../interfaces.ts`

## Limitations

1. **Public Data Only**: Without authentication, only public repositories and profile information are accessible
2. **Rate Limits**: GitHub API has usage limits that may affect large-scale analysis
3. **Private Repositories**: Require authentication and appropriate permissions
4. **Historical Scope**: Activity analysis is limited to recent events (typically last 300 events)
5. **Sample Analysis**: For rate limit efficiency, detailed repository analysis is performed on a sample of repositories

## Future Enhancements

- Historical contribution timeline analysis beyond recent events
- Repository dependency analysis and security vulnerability scanning
- Advanced code quality metrics integration
- Team collaboration patterns and network analysis
- Integration with other development platforms (GitLab, Bitbucket) 