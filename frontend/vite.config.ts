import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  clearScreen: false,
  logLevel: 'warn',
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'recharts',
      'motion/react',
      'i18next',
      'react-i18next',
      'canvas-confetti',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.DS_Store',
        '**/*.tmp',
        '**/*.swp',
        '**/.*',
      ],
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 100,
      },
    },
    warmup: {
      clientFiles: ['./src/App.tsx', './src/main.tsx'],
    },
  },
})
