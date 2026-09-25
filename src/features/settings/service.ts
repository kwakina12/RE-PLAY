import type { AppDatabase } from '@/lib/db';
import { result } from '@/lib/errors';
import { defaultRuntime, type Runtime } from '@/lib/runtime';
import { settingsPatchSchema } from './schema';
import { settingsRepository } from './repository';
export function createSettingsService(db: AppDatabase, runtime: Runtime = defaultRuntime) {
  const repo = settingsRepository(db);
  return {
    getSettings: () => result(async () => repo.get(runtime.clock())),
    updateSettings: (args: unknown) => result(async () => { const input = settingsPatchSchema.parse(args); return repo.update(input.analyticsChoice, runtime.clock()); }),
    exportRecords: () => result(async () => { const records = await repo.snapshot(); return new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: runtime.clock(), records })], { type: 'application/json' }); }),
    clearAllData: () => result(async () => repo.clear()),
  };
}
