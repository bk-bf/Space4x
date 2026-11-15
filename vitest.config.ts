import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'node',
    env: { VITE_SPACE4X_GALLERY: '1' },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', '.svelte-kit/**', 'build/**']
  }
});
