import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT || 4173)
const baseURL = 'http://127.0.0.1:' + port
const browser = process.env.PLAYWRIGHT_BROWSER || 'chromium'
if (browser !== 'chromium' && browser !== 'firefox' && browser !== 'webkit') throw new Error('Unknown PLAYWRIGHT_BROWSER')

export default defineConfig({
  testDir: './tests/e2e',
  workers: 2,
  use: {
    baseURL,
    browserName: browser,
    channel: browser === 'chromium' ? process.env.PLAYWRIGHT_CHANNEL : undefined,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE || undefined },
    trace: 'retain-on-failure',
  },
  projects: [320, 375, 768, 1024, 1440].map(width => ({
    name: browser + '-' + width,
    use: { viewport: { width, height: 900 } },
  })),
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port ' + port + ' --strictPort',
    url: baseURL,
    reuseExistingServer: false,
  },
})
