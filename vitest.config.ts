// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup/vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'electron/**/*.test.{ts,tsx}'],
    testTimeout: 1000 * 30,
    clearMocks: true,
    restoreMocks: true,
  },
})
