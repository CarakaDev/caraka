import { defineConfig, devices } from '@playwright/test'

// Three engines on purpose. The mockups lean on scroll-driven animations, and
// an element that only becomes visible when its timeline advances is invisible
// forever on an engine that lacks them. Chromium alone would never show that.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    // Desktop suite. The comps were drawn at these widths, and site.spec.ts
    // asserts the things they specify.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testMatch: /site\.spec\.ts/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /site\.spec\.ts/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: /site\.spec\.ts/ },

    // Phone suite. The comps never drew a phone; mobile.spec.ts asserts what
    // spec/mobile.md decided instead. Two engines, because the disclosure
    // widget and its marker behave differently in each.
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
