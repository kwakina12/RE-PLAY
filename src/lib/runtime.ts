export type Runtime = { clock: () => string; id: () => string };
export const defaultRuntime: Runtime = { clock: () => new Date().toISOString(), id: () => crypto.randomUUID() };
