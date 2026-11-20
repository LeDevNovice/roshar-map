import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.mjs so tests skip the asset generation and image plugins
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
})
