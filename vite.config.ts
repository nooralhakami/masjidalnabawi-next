import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

// Phase 1: the map page only. The landing page, PWA and CSS inlining come back in phase 7.
export default defineConfig({
  // Relative URLs so the build works on any host or sub-path.
  base: './',
  plugins: [tailwindcss()],
  // Preact's automatic JSX runtime (tsconfig sets the same for type-checking).
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: { map: resolve(import.meta.dirname, 'map.html') },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // The street-graph tests plan dozens of full routes; on a small CI machine one takes ~6 s
    // (default limit 5 s). Same tests and expectations as the live app, only more time.
    testTimeout: 30_000,
  },
});
