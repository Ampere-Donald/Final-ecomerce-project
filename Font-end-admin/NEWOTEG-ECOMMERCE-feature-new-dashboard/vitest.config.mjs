import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: process.cwd(),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.ui.test.{ts,tsx}', 'src/**/*.e2e.test.{ts,tsx}'],
    css: false,
  },
});
