/**
 * ATS Access Control
 * Manages access to ATS dashboard based on email domain restrictions
 */

const AUTHORIZED_DOMAINS = [
  'realmalliance.com',
  'unmask.click'
];

/**
 * Check if a user email is authorized to access the ATS dashboard
 */
export function isAuthorizedForATS(email: string | undefined): boolean {
  if (!email) return false;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return AUTHORIZED_DOMAINS.includes(domain);
}

/**
 * Get the list of authorized domains for display purposes
 */
export function getAuthorizedDomains(): string[] {
  return [...AUTHORIZED_DOMAINS];
}

/**
 * Error message for unauthorized access
 */
export const UNAUTHORIZED_ATS_MESSAGE = 
  `Access to ATS dashboard is restricted to users with email addresses from: ${AUTHORIZED_DOMAINS.join(', ')}`;