import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Separate from vite.config.ts so the @crxjs/vite-plugin (which expects a
// real extension build context) never loads during unit tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
