import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests',
  timeout: 40_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: process.env.WEBKIT === '1' ? 'webkit' : 'chromium',
    channel: process.env.WEBKIT === '1' ? undefined : process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: process.env.WEBKIT === '1' ? [] : ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
