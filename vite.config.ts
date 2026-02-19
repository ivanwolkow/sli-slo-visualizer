import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isGitHubActionsBuild = process.env.GITHUB_ACTIONS === 'true';
const inferredBase =
  repoName && !repoName.endsWith('.github.io') ? `/${repoName}/` : '/';
const base = process.env.VITE_BASE_PATH ?? (isGitHubActionsBuild ? inferredBase : '/');

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
});
