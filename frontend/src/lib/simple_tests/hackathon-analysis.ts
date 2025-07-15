#!/usr/bin/env npx tsx

import * as fs from 'fs';
import type { Applicant } from '../interfaces/applicant';

interface TeamGroup {
  teamName: string;
  members: Applicant[];
  isComplete: boolean; // Has 3 members
  averageCredibility: number;
}

interface CandidateScore {
  applicant: Applicant;
  individualScore: number;
  teamFitScore: number;
  totalScore: number;
  reasoning: string[];
}

interface HackathonSelection {
  selectedTeams: TeamGroup[];
  selectedIndividuals: Applicant[];
  totalSelected: number;
  rejectedApplicants: Applicant[];
}

/**
 * Load all applicants and analyze for hackathon selection
 */
async function analyzeHackathonCandidates(): Promise<CandidateScore[]> {
  const { loadAllApplicants } = await import('../fileStorage');
  const applicants = loadAllApplicants();
  
  console.log(`\n📊 Analyzing ${applicants.length} hackathon candidates...`);
  
  const scores: CandidateScore[] = [];
  
  for (const applicant of applicants) {
    const score = calculateCandidateScore(applicant);
    scores.push(score);
  }
  
  // Sort by total score (highest first)
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  return scores;
}

/**
 * Calculate comprehensive score for a candidate
 */
function calculateCandidateScore(applicant: Applicant): CandidateScore {
  const reasoning: string[] = [];
  let individualScore = 0;
  let teamFitScore = 0;
  
  // 1. Credibility Score (40% weight)
  const credibilityScore = applicant.analysisResult?.credibilityScore || 0;
  individualScore += credibilityScore * 0.4;
  reasoning.push(`Credibility: ${credibilityScore}/100`);
  
  // 2. Technical Skills (30% weight)
  let techScore = 0;
  if (applicant.githubData) {
    techScore += 25; // Has GitHub
    if (applicant.githubData.repositories && applicant.githubData.repositories.length > 5) {
      techScore += 15; // Active developer
    }
    if (applicant.githubData.languages && applicant.githubData.languages.length > 3) {
      techScore += 10; // Diverse skills
    }
  }
  if (applicant.cvData || applicant.linkedinData) {
    const profileData = applicant.linkedinData || applicant.cvData;
    if (profileData?.skills && profileData.skills.length > 5) {
      techScore += 20; // Good skill set
    }
    if (profileData?.experience && profileData.experience.length > 0) {
      techScore += 20; // Has experience
    }
  }
  techScore = Math.min(techScore, 100); // Cap at 100
  individualScore += techScore * 0.3;
  reasoning.push(`Technical Skills: ${techScore}/100`);
  
  // 3. Communication/Profile Quality (20% weight)
  let profileScore = 0;
  if (applicant.hackathonData?.problemsInterested) {
    profileScore += 40; // Described interests
    if (applicant.hackathonData.problemsInterested.length > 50) {
      profileScore += 20; // Detailed description
    }
  }
  if (applicant.linkedinData || applicant.cvData) {
    profileScore += 20; // Has professional profile
  }
  if (applicant.email && applicant.email.includes('@')) {
    profileScore += 20; // Valid contact
  }
  profileScore = Math.min(profileScore, 100);
  individualScore += profileScore * 0.2;
  reasoning.push(`Profile Quality: ${profileScore}/100`);
  
  // 4. Team Fit Score (10% weight)
  if (applicant.hackathonData?.hasTeam === false) {
    teamFitScore = 80; // Looking for team
    reasoning.push('Available for team formation');
  } else if (applicant.hackathonData?.teamName) {
    teamFitScore = 60; // Already has team
    reasoning.push(`Part of team: ${applicant.hackathonData.teamName}`);
  } else {
    teamFitScore = 40; // Unclear team status
    reasoning.push('Team status unclear');
  }
  individualScore += teamFitScore * 0.1;
  
  const totalScore = Math.round(individualScore);
  
  return {
    applicant,
    individualScore: Math.round(individualScore * 0.9), // Individual component
    teamFitScore,
    totalScore,
    reasoning
  };
}

/**
 * Group candidates by teams and identify complete teams
 */
function groupByTeams(scores: CandidateScore[]): { teams: TeamGroup[], individuals: CandidateScore[] } {
  const teamMap = new Map<string, Applicant[]>();
  const individuals: CandidateScore[] = [];
  
  for (const score of scores) {
    const teamName = score.applicant.hackathonData?.teamName;
    
    if (teamName && teamName.trim() && teamName !== '-' && teamName !== 'N/A') {
      const normalizedTeamName = teamName.toLowerCase().trim();
      if (!teamMap.has(normalizedTeamName)) {
        teamMap.set(normalizedTeamName, []);
      }
      teamMap.get(normalizedTeamName)!.push(score.applicant);
    } else {
      individuals.push(score);
    }
  }
  
  const teams: TeamGroup[] = [];
  for (const [teamName, members] of teamMap.entries()) {
    const avgCredibility = members.reduce((sum, m) => 
      sum + (m.analysisResult?.credibilityScore || 50), 0) / members.length;
    
    teams.push({
      teamName,
      members,
      isComplete: members.length >= 3,
      averageCredibility: Math.round(avgCredibility)
    });
  }
  
  // Sort teams by average credibility
  teams.sort((a, b) => b.averageCredibility - a.averageCredibility);
  
  return { teams, individuals };
}

/**
 * Select 42 candidates optimizing for team balance and quality
 */
function selectCandidates(scores: CandidateScore[]): HackathonSelection {
  const { teams, individuals } = groupByTeams(scores);
  
  let selected = 0;
  const selectedTeams: TeamGroup[] = [];
  const selectedIndividuals: Applicant[] = [];
  const rejectedApplicants: Applicant[] = [];
  
  console.log(`\n🎯 Selection Strategy:`);
  console.log(`  📝 Found ${teams.length} teams`);
  console.log(`  👤 Found ${individuals.length} individuals`);
  
  // 1. Select complete teams first (3 members each)
  for (const team of teams) {
    if (team.isComplete && selected + 3 <= 42) {
      if (team.averageCredibility >= 60) { // Quality threshold
        selectedTeams.push(team);
        selected += 3;
        console.log(`  ✅ Selected team "${team.teamName}" (3 members, avg credibility: ${team.averageCredibility})`);
      } else {
        console.log(`  ❌ Rejected team "${team.teamName}" (low credibility: ${team.averageCredibility})`);
        rejectedApplicants.push(...team.members);
      }
    } else if (team.isComplete) {
      console.log(`  ⏭️  Skipped team "${team.teamName}" (would exceed 42 limit)`);
      rejectedApplicants.push(...team.members);
    }
  }
  
  // 2. Select partial teams (2 members, need 1 more)
  for (const team of teams) {
    if (team.members.length === 2 && selected + 2 <= 42) {
      if (team.averageCredibility >= 65) { // Higher threshold for incomplete teams
        selectedIndividuals.push(...team.members);
        selected += 2;
        console.log(`  ✅ Selected partial team "${team.teamName}" (2 members, avg credibility: ${team.averageCredibility})`);
      } else {
        rejectedApplicants.push(...team.members);
      }
    } else if (team.members.length === 2) {
      rejectedApplicants.push(...team.members);
    }
  }
  
  // 3. Fill remaining spots with highest-scoring individuals
  const remainingSlots = 42 - selected;
  const topIndividuals = individuals
    .filter(s => s.totalScore >= 60) // Quality threshold
    .slice(0, remainingSlots);
  
  for (const individual of topIndividuals) {
    selectedIndividuals.push(individual.applicant);
    selected++;
    console.log(`  ✅ Selected individual "${individual.applicant.name}" (score: ${individual.totalScore})`);
  }
  
  // 4. Add rejected individuals
  for (const individual of individuals.slice(remainingSlots)) {
    rejectedApplicants.push(individual.applicant);
  }
  
  // Add remaining partial teams to rejected
  for (const team of teams) {
    if (team.members.length === 1) {
      rejectedApplicants.push(...team.members);
    }
  }
  
  return {
    selectedTeams,
    selectedIndividuals,
    totalSelected: selected,
    rejectedApplicants
  };
}

/**
 * Export results to CSV for review
 */
function exportResults(selection: HackathonSelection, scores: CandidateScore[]): void {
  const csvRows: string[] = [
    'Name,Email,Team,Status,Credibility Score,Total Score,LinkedIn,GitHub,Problems Interested,Reasoning'
  ];
  
  // Add selected candidates
  for (const team of selection.selectedTeams) {
    for (const member of team.members) {
      const score = scores.find(s => s.applicant.id === member.id);
      csvRows.push([
        member.name,
        member.email,
        team.teamName,
        'ACCEPTED',
        member.analysisResult?.credibilityScore || '',
        score?.totalScore || '',
        member.originalLinkedinUrl || '',
        member.originalGithubUrl || '',
        member.hackathonData?.problemsInterested || '',
        score?.reasoning.join('; ') || ''
      ].map(field => `"${field}"`).join(','));
    }
  }
  
  for (const individual of selection.selectedIndividuals) {
    const score = scores.find(s => s.applicant.id === individual.id);
    csvRows.push([
      individual.name,
      individual.email,
      individual.hackathonData?.teamName || 'INDIVIDUAL',
      'ACCEPTED',
      individual.analysisResult?.credibilityScore || '',
      score?.totalScore || '',
      individual.originalLinkedinUrl || '',
      individual.originalGithubUrl || '',
      individual.hackathonData?.problemsInterested || '',
      score?.reasoning.join('; ') || ''
    ].map(field => `"${field}"`).join(','));
  }
  
  // Add rejected candidates
  for (const rejected of selection.rejectedApplicants) {
    const score = scores.find(s => s.applicant.id === rejected.id);
    csvRows.push([
      rejected.name,
      rejected.email,
      rejected.hackathonData?.teamName || '',
      'REJECTED',
      rejected.analysisResult?.credibilityScore || '',
      score?.totalScore || '',
      rejected.originalLinkedinUrl || '',
      rejected.originalGithubUrl || '',
      rejected.hackathonData?.problemsInterested || '',
      score?.reasoning.join('; ') || ''
    ].map(field => `"${field}"`).join(','));
  }
  
  const csvContent = csvRows.join('\n');
  const filename = `hackathon_selection_${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(filename, csvContent);
  console.log(`\n📁 Results exported to: ${filename}`);
}

/**
 * Main function
 */
async function main() {
  try {
    const scores = await analyzeHackathonCandidates();
    const selection = selectCandidates(scores);
    
    console.log(`\n🎉 Final Selection Summary:`);
    console.log(`  ✅ Selected: ${selection.totalSelected}/42 candidates`);
    console.log(`  👥 Complete teams: ${selection.selectedTeams.length}`);
    console.log(`  👤 Individuals: ${selection.selectedIndividuals.length}`);
    console.log(`  ❌ Rejected: ${selection.rejectedApplicants.length}`);
    
    exportResults(selection, scores);
    
    if (selection.totalSelected < 42) {
      console.log(`\n⚠️  Warning: Only selected ${selection.totalSelected}/42 candidates. Consider lowering quality thresholds.`);
    }
    
  } catch (error) {
    console.error('Error during hackathon analysis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { analyzeHackathonCandidates, selectCandidates, exportResults };