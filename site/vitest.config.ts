import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.{js,ts}'],
    // e2e/ is Playwright's; its `test` import is a different one entirely.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
