import { z } from 'zod';
import { categorySchema, verdictSchema, repeatReasonSchema, changeReasonSchema, idSchema, revisionSchema } from '@/features/records/schema';
export const draftValuesSchema = z.strictObject({ title: z.string(), category: categorySchema.nullable(), amountText: z.string(), verdict: verdictSchema.nullable(), reasonCode: z.union([repeatReasonSchema, changeReasonSchema]).nullable(), nextRule: z.string() });
export const startDraftSchema = z.discriminatedUnion('mode', [z.strictObject({ mode: z.literal('create') }), z.strictObject({ mode: z.literal('edit'), recordId: idSchema })]);
export const saveDraftSchema = z.strictObject({ id: idSchema, values: draftValuesSchema, step: z.enum(['expense', 'reflection', 'edit']), expectedRevision: revisionSchema });
export const emptyValues = { title: '', category: null, amountText: '', verdict: null, reasonCode: null, nextRule: '' } as const;
