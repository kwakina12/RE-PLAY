export function newestFirst<T extends { id: string }>(rows: T[], timestamp: (row: T) => string): T[] {
  return rows.sort((a, b) => timestamp(a) === timestamp(b) ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : timestamp(a) > timestamp(b) ? -1 : 1);
}
