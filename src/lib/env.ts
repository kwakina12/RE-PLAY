export type AppEnv = 'development' | 'preview' | 'production';
export function databaseName(value: unknown): string {
  switch (value) {
    case 'development': return 'dasissum-dev';
    case 'preview': return 'dasissum-preview';
    case 'production': return 'dasissum';
    default: throw new Error('VITE_APP_ENV must be development, preview or production');
  }
}
