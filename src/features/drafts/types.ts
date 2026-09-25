import type { z } from 'zod';
import type { draftValuesSchema } from './schema';
export type DraftValues = z.infer<typeof draftValuesSchema>;
export type Draft = { id: string; recordId: string; values: DraftValues; revision: number; createdAt: string; updatedAt: string } & ({ mode: 'create'; step: 'expense' | 'reflection'; baseRevision: null } | { mode: 'edit'; step: 'edit'; baseRevision: number });
