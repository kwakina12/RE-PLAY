import type { z } from 'zod';
import type { categorySchema, verdictSchema, recordInputSchema, filtersSchema } from './schema';
export type Category = z.infer<typeof categorySchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type RecordInput = z.infer<typeof recordInputSchema>;
export type SpendingRecord = RecordInput & { id: string; createdAt: string; updatedAt: string; revision: number };
export type Filters = z.infer<typeof filtersSchema>;
