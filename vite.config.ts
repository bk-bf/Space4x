import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig } from 'vite';

const out = process.env.SPACE4X_OUT ?? 'build';

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({ fallback: 'index.html', pages: out, assets: out }),
      paths: { base: (process.env.SPACE4X_BASE ?? '') as '' | `/${string}` }
    })
  ],
  server: {
    port: Number(process.env.PORT) || 5194,
    allowedHosts: ['ubuntu', 'ubuntuserver']
  }
});
