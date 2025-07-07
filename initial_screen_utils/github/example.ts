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
        // Process the GitHub account
        console.log('Starting GitHub account processing...')
        const githubData = await processGitHubAccount(githubUrl, {
          maxRepos: 50,  // Limit repositories for faster processing
          includeOrganizations: true
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
      includeOrganizations: true
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