/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { doflowCoinsVitePlugin } from './server/index.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), doflowCoinsVitePlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

