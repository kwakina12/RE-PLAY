import type { AppDatabase } from '@/lib/db';
import { result } from '@/lib/errors';
import { defaultRuntime, type Runtime } from '@/lib/runtime';
import { recordRepository } from './repository';
import { createRecordSchema, updateRecordSchema, filtersSchema, idSchema } from './schema';
export function createRecordService(db: AppDatabase, runtime: Runtime = defaultRuntime) {
  const repo = recordRepository(db);
  return {
    createRecord: (args: unknown) => result(async () => { const input = createRecordSchema.parse(args); const now = runtime.clock(); return repo.create(input, now); }),
    updateRecord: (args: unknown) => result(async () => { const input = updateRecordSchema.parse(args); const now = runtime.clock(); return repo.update(input, now); }),
    listRecords: (filters: unknown = {}) => result(async () => repo.list(filtersSchema.parse(filters))),
    getRecord: (id: unknown) => result(async () => repo.get(idSchema.parse(id))),
    deleteRecord: (id: unknown) => result(async () => repo.delete(idSchema.parse(id))),
  };
}
