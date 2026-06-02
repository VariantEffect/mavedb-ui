import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    coverage: {
      all: true,
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{js,ts}']
    }
  }
})
