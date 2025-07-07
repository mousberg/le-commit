import { processGitHubAccount, saveGitHubDataToJson, extractUsernameFromUrl } from './github'
import * as path from 'path'

/**
 * Example usage of GitHub processing functions
 */
async function exampleUsage() {
  try {
    // Example GitHub URLs/usernames to process
    const githubAccounts = [
      'octocat',  // Just username
      'https://github.com/torvalds',  // Full URL
      'https://github.com/gaearon',   // Another full URL
    ]

    for (const githubUrl of githubAccounts) {
      console.log(`\n=== Processing GitHub Account: ${githubUrl} ===`)
      
      // Extract username for output file naming
      const username = extractUsernameFromUrl(githubUrl)
      
      try {
        // Process the GitHub account with enhanced features
        console.log('Starting GitHub account processing...')
        const githubData = await processGitHubAccount(githubUrl, {
          maxRepos: 50,  // Limit repositories for faster processing
          includeOrganizations: true,
          analyzeContent: true,  // Enable content analysis
          maxContentAnalysis: 5,  // Analyze top 5 repositories
          includeActivity: true   // Enable enhanced activity analysis
        })

        // Save the extracted data to JSON
        const outputPath = path.join(__dirname, `../../data/github_${username}_data.json`)
        saveGitHubDataToJson(githubData, outputPath)

        // Display summary
        console.log('\n=== GitHub Account Summary ===')
        console.log(`Username: ${githubData.username}`)
        console.log(`Name: ${githubData.name}`)
        console.log(`Bio: ${githubData.bio}`)
        console.log(`Location: ${githubData.location}`)
        console.log(`Company: ${githubData.company}`)
        console.log(`Email: ${githubData.email}`)
        console.log(`Blog: ${githubData.blog}`)
        console.log(`Profile URL: ${githubData.profileUrl}`)
        console.log(`Account Created: ${new Date(githubData.accountCreationDate).toLocaleDateString()}`)
        console.log(`Followers: ${githubData.followers}`)
        console.log(`Following: ${githubData.following}`)
        console.log(`Public Repos: ${githubData.publicRepos}`)
        console.log(`Public Gists: ${githubData.publicGists}`)
        
        // Repository statistics
        console.log(`\nRepository Statistics:`)
        console.log(`  Total Analyzed: ${githubData.repositories.length}`)
        console.log(`  Own Repositories: ${githubData.repositories.filter(r => !r.isFork).length}`)
        console.log(`  Forked Repositories: ${githubData.forkedRepos}`)
        console.log(`  Total Stars Received: ${githubData.starredRepos}`)
        
        // Language statistics
        if (githubData.languages.length > 0) {
          console.log(`\nTop Programming Languages:`)
          githubData.languages.slice(0, 5).forEach((lang, index) => {
            console.log(`  ${index + 1}. ${lang.language}: ${lang.percentage.toFixed(1)}%`)
          })
        }

        // Recent repositories
        if (githubData.repositories.length > 0) {
          console.log(`\nMost Recently Updated Repositories:`)
          githubData.repositories
            .slice(0, 5)
            .forEach((repo, index) => {
              const lastUpdate = new Date(repo.updatedAt).toLocaleDateString()
              console.log(`  ${index + 1}. ${repo.name} (${repo.language || 'No language'}) - Updated: ${lastUpdate}`)
              console.log(`     ⭐ ${repo.stars} | 🍴 ${repo.forks} | 👁️ ${repo.watchers}`)
            })
        }

        // Organizations
        if (githubData.organizations.length > 0) {
          console.log(`\nOrganizations (${githubData.organizations.length}):`)
          githubData.organizations.forEach((org, index) => {
            console.log(`  ${index + 1}. ${org.name || org.login} (${org.publicRepos} public repos)`)
          })
        }

        // Quality Analysis Results
        if (githubData.overallQualityScore) {
          console.log(`\n🏆 Overall Quality Score: ${githubData.overallQualityScore.overall}/100`)
          console.log(`Quality Breakdown:`)
          console.log(`  📖 README Quality: ${githubData.overallQualityScore.readme}/100`)
          console.log(`  🏗️  Code Organization: ${githubData.overallQualityScore.codeOrganization}/100`)
          console.log(`  🚀 CI/CD: ${githubData.overallQualityScore.cicd}/100`)
          console.log(`  📚 Documentation: ${githubData.overallQualityScore.documentation}/100`)
          console.log(`  🔧 Maintenance: ${githubData.overallQualityScore.maintenance}/100`)
          console.log(`  👥 Community: ${githubData.overallQualityScore.community}/100`)
        }

        // Repository Content Analysis
        if (githubData.repositoryContent && githubData.repositoryContent.length > 0) {
          console.log(`\n📊 Repository Content Analysis (${githubData.repositoryContent.length} repos):`)
          githubData.repositoryContent.forEach((content, index) => {
            const repo = githubData.repositories[index]
            console.log(`\n  ${index + 1}. ${repo.name} (Quality: ${content.qualityScore.overall}/100)`)
            console.log(`     📝 README: ${content.readme.exists ? '✅' : '❌'} (${content.readme.qualityScore}/100)`)
            console.log(`     🔨 CI/CD: ${content.workflows.length > 0 ? `✅ (${content.workflows.length} workflows)` : '❌'}`)
            console.log(`     🧪 Tests: ${content.codeStructure.hasTests ? '✅' : '❌'}`)
            console.log(`     📦 Package.json: ${content.packageJson?.exists ? '✅' : '❌'}`)
            if (content.packageJson) {
              console.log(`       - Frameworks: ${content.packageJson.frameworks?.join(', ') || 'None detected'}`)
              console.log(`       - Linting: ${content.packageJson.hasLinting ? '✅' : '❌'} ${content.packageJson.lintingTools?.length ? `(${content.packageJson.lintingTools.join(', ')})` : ''}`)
              console.log(`       - Testing: ${content.packageJson.hasTesting ? '✅' : '❌'} ${content.packageJson.testingFrameworks?.length ? `(${content.packageJson.testingFrameworks.join(', ')})` : ''}`)
              console.log(`       - TypeScript: ${content.packageJson.hasTypeScript ? '✅' : '❌'}`)
              console.log(`       - Build Tools: ${content.packageJson.buildTools?.length ? content.packageJson.buildTools.join(', ') : 'None detected'}`)
            }
          })
        }

        // Enhanced Activity Analysis
        if (githubData.activityAnalysis) {
          console.log(`\n⚡ Enhanced Activity Analysis:`)
          const { commitFrequency, issueMetrics, pullRequestMetrics, collaborationSignals } = githubData.activityAnalysis
          
          console.log(`\n  📝 Commit Patterns & Quality:`)
          console.log(`     Last Week: ${commitFrequency.lastWeek} commits`)
          console.log(`     Last Month: ${commitFrequency.lastMonth} commits`)
          console.log(`     Last Year: ${commitFrequency.lastYear} commits`)
          console.log(`     Weekly Average: ${commitFrequency.averagePerWeek} commits`)
          console.log(`     Commit Message Quality: ${commitFrequency.commitMessageQuality}/100`)
          console.log(`     Conventional Commits: ${commitFrequency.conventionalCommits ? '✅' : '❌'}`)
          
          console.log(`\n  🐛 Issue Management:`)
          console.log(`     Open Issues: ${issueMetrics.totalOpen}`)
          console.log(`     Closed Issues: ${issueMetrics.totalClosed}`)
          console.log(`     Uses Labels: ${issueMetrics.hasLabels ? '✅' : '❌'}`)
          console.log(`     Has Issue Templates: ${issueMetrics.hasTemplates ? '✅' : '❌'}`)
          
          console.log(`\n  🔄 Pull Request Quality:`)
          console.log(`     Open PRs: ${pullRequestMetrics.totalOpen}`)
          console.log(`     Merged PRs: ${pullRequestMetrics.totalMerged}`)
          console.log(`     Requires Reviews: ${pullRequestMetrics.requiresReviews ? '✅' : '❌'}`)
          console.log(`     Has PR Templates: ${pullRequestMetrics.hasTemplates ? '✅' : '❌'}`)
          console.log(`     Maintainer Merge Rate: ${pullRequestMetrics.maintainerMergeRate}%`)
          
          console.log(`\n  🤝 Collaboration & Community:`)
          console.log(`     Unique Contributors: ${collaborationSignals.uniqueContributors}`)
          console.log(`     Outside Contributions: ${collaborationSignals.outsideContributions}`)
          console.log(`     Fork-to-Star Ratio: ${collaborationSignals.forkToStarRatio}`)
          console.log(`     Community Engagement Score: ${collaborationSignals.communityEngagement}/100`)
          console.log(`     Code of Conduct: ${collaborationSignals.hasCodeOfConduct ? '✅' : '❌'}`)
          console.log(`     Contributing Guide: ${collaborationSignals.hasContributingGuide ? '✅' : '❌'}`)
          console.log(`     Security Policy: ${collaborationSignals.hasSecurityPolicy ? '✅' : '❌'}`)
        }

        // Enhanced Contribution Statistics
        console.log(`\n🎯 Contribution Calendar & Streaks:`)
        console.log(`  Current Streak: ${githubData.contributions.streakDays} days`)
        console.log(`  Total Commits: ${githubData.contributions.totalCommits}`)
        console.log(`  Total Pull Requests: ${githubData.contributions.totalPullRequests}`)
        console.log(`  Total Issues Opened: ${githubData.contributions.totalIssues}`)
        console.log(`  Most Active Day: ${githubData.contributions.mostActiveDay}`)
        console.log(`  Contributions This Year: ${githubData.contributions.contributionsLastYear}`)

        console.log(`\n=== Processing Complete ===`)
        console.log(`Full GitHub data saved to: ${outputPath}`)
        
      } catch (accountError) {
        console.error(`Error processing account ${githubUrl}:`, accountError)
        continue // Continue with next account
      }
    }

  } catch (error) {
    console.error('Error in GitHub processing example:', error)
    process.exit(1)
  }
}

/**
 * Example for processing a single GitHub account
 */
async function processSingleAccount(githubUrl: string) {
  try {
    console.log(`Processing single GitHub account: ${githubUrl}`)
    
    const githubData = await processGitHubAccount(githubUrl, {
      maxRepos: 100,
      includeOrganizations: true,
      analyzeContent: true,
      maxContentAnalysis: 10,
      includeActivity: true
    })
    
    const username = extractUsernameFromUrl(githubUrl)
    const outputPath = path.join(__dirname, `../../data/github_${username}_detailed.json`)
    saveGitHubDataToJson(githubData, outputPath)
    
    console.log(`Detailed GitHub data saved to: ${outputPath}`)
    return githubData
    
  } catch (error) {
    console.error('Error processing single GitHub account:', error)
    throw error
  }
}

/**
 * Example for comparing multiple GitHub accounts
 */
async function compareGitHubAccounts(githubUrls: string[]) {
  try {
    console.log('Comparing multiple GitHub accounts...')
    
    const accountData = []
    
    for (const url of githubUrls) {
      try {
        const data = await processGitHubAccount(url, {
          maxRepos: 50,
          includeOrganizations: false // Skip orgs for faster comparison
        })
        accountData.push(data)
      } catch (error) {
        console.error(`Failed to process ${url}:`, error)
      }
    }
    
    if (accountData.length === 0) {
      console.log('No accounts were successfully processed')
      return
    }
    
    console.log('\n=== Account Comparison ===')
    console.log('Username\t\tRepos\tFollowers\tLanguages\tStars')
    console.log('-'.repeat(70))
    
    accountData.forEach(account => {
      const topLang = account.languages.length > 0 ? account.languages[0].language : 'None'
      console.log(`${account.username.padEnd(15)}\t${account.publicRepos}\t${account.followers}\t\t${topLang}\t\t${account.starredRepos}`)
    })
    
    // Save comparison data
    const comparisonPath = path.join(__dirname, '../../data/github_comparison.json')
    saveGitHubDataToJson(accountData as any, comparisonPath)
    console.log(`\nComparison data saved to: ${comparisonPath}`)
    
  } catch (error) {
    console.error('Error comparing GitHub accounts:', error)
    throw error
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    // Run default example
    console.log('Running default GitHub processing example...')
    console.log('Note: GitHub API has rate limits. Consider setting GITHUB_TOKEN for higher limits.')
    
    if (process.env.GITHUB_TOKEN) {
      console.log('✅ GitHub token detected - higher rate limits available')
    } else {
      console.log('⚠️  No GitHub token - using public API rate limits')
      console.log('Set GITHUB_TOKEN environment variable for better performance:')
      console.log('export GITHUB_TOKEN="your-github-token-here"')
    }
    
    exampleUsage()
  } else if (args[0] === 'single' && args[1]) {
    // Process single account
    processSingleAccount(args[1])
  } else if (args[0] === 'compare' && args.length > 2) {
    // Compare multiple accounts
    const urls = args.slice(1)
    compareGitHubAccounts(urls)
  } else {
    console.log('Usage:')
    console.log('  node example.js                           # Run default example')
    console.log('  node example.js single <github-url>       # Process single account')
    console.log('  node example.js compare <url1> <url2>...  # Compare multiple accounts')
    console.log('')
    console.log('Examples:')
    console.log('  node example.js single octocat')
    console.log('  node example.js single https://github.com/torvalds')
    console.log('  node example.js compare octocat torvalds gaearon')
  }
}

export { exampleUsage, processSingleAccount, compareGitHubAccounts } 