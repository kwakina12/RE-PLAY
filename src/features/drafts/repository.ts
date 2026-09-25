import type { z } from 'zod';
import type { AppDatabase } from '@/lib/db';
import { conflict, required, validAssociation } from '@/lib/errors';
import { newestFirst } from '@/lib/order';
import { emptyValues, type startDraftSchema, type saveDraftSchema } from './schema';
import type { Draft } from './types';
export function draftRepository(db: AppDatabase) {
  return {
    async start(args: z.infer<typeof startDraftSchema>, ids: { id: string; recordId: string }, now: string): Promise<Draft> {
      return db.transaction('rw', db.records, db.drafts, async () => {
        const common = { id: ids.id, recordId: ids.recordId, revision: 1, createdAt: now, updatedAt: now };
        let draft: Draft;
        if (args.mode === 'create') draft = { ...common, mode: 'create', step: 'expense', baseRevision: null, values: { ...emptyValues } };
        else {
          const record = required(await db.records.get(args.recordId));
          draft = { ...common, recordId: record.id, mode: 'edit', step: 'edit', baseRevision: record.revision, values: { title: record.title, category: record.category, amountText: record.amount === null ? '' : String(record.amount), verdict: record.verdict, reasonCode: record.reasonCode, nextRule: record.nextRule ?? '' } };
        }
        await db.drafts.add(draft);
        return draft;
      });
    },
    async save(args: z.infer<typeof saveDraftSchema>, now: string): Promise<Draft> {
      return db.transaction('rw', db.drafts, async () => {
        const current = required(await db.drafts.get(args.id));
        validAssociation(current.mode === 'create' ? args.step !== 'edit' : args.step === 'edit');
        conflict(current.revision === args.expectedRevision);
        const draft: Draft = current.mode === 'create'
          ? { ...current, values: args.values, step: args.step as 'expense' | 'reflection', revision: current.revision + 1, updatedAt: now }
          : { ...current, values: args.values, revision: current.revision + 1, updatedAt: now };
        await db.drafts.update(draft.id, draft);
        return draft;
      });
    },
    async get(id: string) { return required(await db.drafts.get(id)); },
    async list() { return newestFirst(await db.drafts.toArray(), row => row.updatedAt); },
    async delete(id: string) { await db.drafts.delete(id); },
  };
}
