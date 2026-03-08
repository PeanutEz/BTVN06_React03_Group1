import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://ecommerce-franchise-training-nodejs.vercel.app',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'mapbox': ['mapbox-gl']
        }
      }
    }
  }
})
