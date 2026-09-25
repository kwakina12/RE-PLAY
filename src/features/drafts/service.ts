import type { AppDatabase } from '@/lib/db';
import { result } from '@/lib/errors';
import { defaultRuntime, type Runtime } from '@/lib/runtime';
import { idSchema } from '@/features/records/schema';
import { draftRepository } from './repository';
import { startDraftSchema, saveDraftSchema } from './schema';
export function createDraftService(db: AppDatabase, runtime: Runtime = defaultRuntime) {
  const repo = draftRepository(db);
  return {
    startDraft: (args: unknown) => result(async () => {
      const input = startDraftSchema.parse(args);
      const ids = { id: idSchema.parse(runtime.id()), recordId: input.mode === 'create' ? idSchema.parse(runtime.id()) : input.recordId };
      return repo.start(input, ids, runtime.clock());
    }),
    saveDraft: (args: unknown) => result(async () => { const input = saveDraftSchema.parse(args); return repo.save(input, runtime.clock()); }),
    getDraft: (id: unknown) => result(async () => repo.get(idSchema.parse(id))),
    listDrafts: () => result(async () => repo.list()),
    deleteDraft: (id: unknown) => result(async () => repo.delete(idSchema.parse(id))),
  };
}
