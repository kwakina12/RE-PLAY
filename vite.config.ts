import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const appEnv = process.env.VITE_APP_ENV ?? env.VITE_APP_ENV;
  if (command === 'build' && !['preview', 'production'].includes(appEnv ?? '')) {
    throw new Error('Build requires explicit VITE_APP_ENV=preview or production');
  }
  return { plugins: [react(), tailwindcss()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } };
});
