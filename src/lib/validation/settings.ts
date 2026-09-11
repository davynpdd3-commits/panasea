import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  logoUrl: z.string().trim().url().optional(),
  currency: z.string().trim().default('IDR'),
  taxRate: z.number().min(0, { message: 'Tax rate cannot be negative' }).optional(),
  serviceCharge: z.number().min(0, { message: 'Service charge cannot be negative' }).optional(),
  receiptHeader: z.string().trim().optional(),
  receiptFooter: z.string().trim().optional(),
  printerName: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
