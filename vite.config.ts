import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SmartGrid',
      fileName: 'smart-grid',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'smart-grid.[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
