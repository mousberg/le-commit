# GitHub Account Analyzer

This module provides functionality to collect and analyze GitHub account information using the GitHub API.

## Features

- Extract comprehensive account information from GitHub usernames or profile URLs
- Collect repository data including languages, stars, forks, and metadata
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
    // Process a GitHub account
    const githubData = await processGitHubAccount('octocat', {
      maxRepos: 50,
      includeOrganizations: true
    })
    
    // Save the data
    saveGitHubDataToJson(githubData, './output/github-data.json')
    
    console.log(`Analyzed ${githubData.repositories.length} repositories`)
    console.log(`Top language: ${githubData.languages[0]?.language}`)
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
  includeOrganizations: true  // Include organization data (default: true)
}

const githubData = await processGitHubAccount('username', options)
```

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

## Examples

### Run Example Scripts

```bash
# Default example - processes multiple accounts
node example.js

# Process a single account with detailed output
node example.js single octocat

# Compare multiple accounts
node example.js compare octocat torvalds gaearon
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
3. **Contribution Calendar**: Detailed contribution statistics require additional API calls not implemented in basic version
4. **Private Repositories**: Require authentication and appropriate permissions

## Future Enhancements

- Contribution calendar analysis
- Commit activity patterns
- Issue and pull request statistics
- Collaboration network analysis
- Repository dependency analysis
- Code quality metrics integration 