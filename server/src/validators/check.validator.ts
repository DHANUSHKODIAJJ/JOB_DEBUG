import { z } from 'zod';

export const createCheckSchema = z.object({
  body: z.object({
    companyName: z.string().trim().max(120).optional(),
    statedLocation: z.string().trim().max(120).optional(),
    hrEmail: z.string().trim().toLowerCase().email('Valid email required').optional().or(z.literal('')),
    jobText: z.string().trim().min(1, 'Paste the job description first').max(10000),
    salaryText: z.string().trim().max(80).optional(),
    sourceUrl: z.string().trim().url().optional().or(z.literal('')),
  }),
});

export const checkUrlSchema = z.object({
  body: z.object({
    url: z.string().trim().min(1).max(500).refine((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' &&
          (parsed.hostname === 'www.naukri.com' || parsed.hostname === 'naukri.com') &&
          !parsed.port && !parsed.username && !parsed.password &&
          /^\/job-listings-[a-z0-9-]+-\d{9,15}\/?$/i.test(parsed.pathname);
      } catch {
        return false;
      }
    }, 'Paste a valid Naukri job listing URL'),
  }),
});

export type CreateCheckInput = z.infer<typeof createCheckSchema>['body'];
export type CheckUrlInput = z.infer<typeof checkUrlSchema>['body'];
