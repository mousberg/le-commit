import { z } from 'zod';

// Essential validation schemas - keep it simple

// Common
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();

// Workspace
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

// Applicant creation (for FormData)
export const createApplicantFormSchema = z.object({
  workspaceId: uuidSchema,
  githubUrl: z.string().url().optional().or(z.literal(''))
});

// Basic query params
export const paginationSchema = z.object({
  limit: z.string().transform(val => Math.min(parseInt(val) || 50, 100)).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional()
});

// Simple file validation helper
export const validateFile = (file: File, maxSizeBytes: number = 10 * 1024 * 1024) => {
  const errors: string[] = [];

  if (file.size > maxSizeBytes) {
    errors.push(`File too large (max ${Math.round(maxSizeBytes / (1024 * 1024))}MB)`);
  }

  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    errors.push('Invalid file type');
  }

  return { isValid: errors.length === 0, errors };
};
