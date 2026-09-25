import { z } from 'zod';
export const settingsPatchSchema = z.strictObject({ analyticsChoice: z.enum(['unset', 'enabled', 'disabled']) });
export type AppSettings = z.infer<typeof settingsPatchSchema> & { id: 'app'; schemaVersion: 1; updatedAt: string };
