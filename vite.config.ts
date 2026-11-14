import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwind()],
  build: { license: { fileName: 'licenses/software.md' } },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
})
