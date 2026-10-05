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
  plugins: [figmaAssetResolver(), react(), tailwindcss()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'motion/react', 'i18next', 'react-i18next', 'canvas-confetti'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('node_modules/lucide-react')) return 'icons'
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'i18n'
          if (id.includes('node_modules/vaul')) return 'drawer'
          if (id.includes('node_modules/html-to-image')) return 'image-export'
          if (id.includes('node_modules/canvas-confetti')) return 'confetti'
        },
      },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.DS_Store', '**/*.tmp', '**/*.swp', '**/.*'],
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 100 },
    },
    warmup: { clientFiles: ['./src/App.tsx', './src/main.tsx'] },
  },
})
