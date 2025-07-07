import { Signal } from './interfaces/signals';

export const LINKEDIN_SIGNALS: Signal[] = [
  {
    name: 'linkedin_identity_match',
    description: 'Full name matches CV and GitHub handle/email with clear consistency',
    importance: 0.9,
    requiresCV: true,
    requiresLinkedIn: true
  },
  {
    name: 'linkedin_account_age',
    description: 'Account creation date is more than 1 year old',
    importance: 0.7,
    requiresCV: false,
    requiresLinkedIn: true
  },
  {
    name: 'linkedin_job_history_match',
    description: 'Job titles and dates match CV with tenure at each company of more than 3 months',
    importance: 0.8,
    requiresCV: true,
    requiresLinkedIn: true
  },
  {
    name: 'linkedin_company_verification',
    description: 'Companies mentioned have existing LinkedIn pages and are real organizations',
    importance: 0.9,
    requiresCV: false,
    requiresLinkedIn: true
  },
  {
    name: 'linkedin_education_match',
    description: 'Education degrees and institutions match CV and link to real universities',
    importance: 0.85,
    requiresCV: true,
    requiresLinkedIn: true
  },
  {
    name: 'linkedin_connection_count',
    description: 'Has more than 50 connections',
    importance: 0.4,
    requiresCV: false,
    requiresLinkedIn: true
  },
  {
    name: 'linkedin_connection_relevance',
    description: 'Connections include people from companies they claim to have worked for',
    importance: 0.7,
    requiresCV: false,
    requiresLinkedIn: true
  },
  {
    name: 'linkedin_engagement_activity',
    description: 'Shows authentic activity: posts, likes, comments',
    importance: 0.4,
    requiresCV: false,
    requiresLinkedIn: true
  }
];

export const CV_SIGNALS: Signal[] = [
  {
    name: 'cv_timeline_consistency',
    description: 'Chronological order with no overlapping full-time jobs unless explicitly freelance',
    importance: 0.9,
    requiresCV: true,
    requiresLinkedIn: false
  },
  {
    name: 'cv_verifiable_claims',
    description: 'OSS contributions, patents, or public work can be verified on GitHub/Google/Arxiv',
    importance: 0.85,
    requiresCV: true,
    requiresLinkedIn: false
  },
  {
    name: 'cv_project_specificity',
    description: 'Project descriptions are specific and technical, not just buzzwords',
    importance: 0.3,
    requiresCV: true,
    requiresLinkedIn: false
  },


  {
    name: 'cv_contact_info_consistency',
    description: 'Email matches GitHub/LinkedIn or shows obvious consistency',
    importance: 0.8,
    requiresCV: true,
    requiresLinkedIn: true
  },


];

export const COMBINED_SIGNALS: Signal[] = [
  {
    name: 'cross_platform_consistency',
    description: 'Overall consistency between CV and LinkedIn profiles',
    importance: 0.95,
    requiresCV: true,
    requiresLinkedIn: true
  },
  {
    name: 'timeline_cross_verification',
    description: 'Employment timelines match across CV and LinkedIn',
    importance: 0.9,
    requiresCV: true,
    requiresLinkedIn: true
  },
  {
    name: 'contact_info_alignment',
    description: 'Contact information is consistent across all platforms',
    importance: 0.8,
    requiresCV: true,
    requiresLinkedIn: true
  }
];

export const ALL_SIGNALS: Signal[] = [
  ...LINKEDIN_SIGNALS,
  ...CV_SIGNALS,
  ...COMBINED_SIGNALS
];
