import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // ─── Performance: Code splitting for better caching ───
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'vendor'
            }
          }
        },
      },
    },
    // ─── Source maps off for production ───
    sourcemap: false,
    // ─── Asset directory ───
    assetsDir: 'assets',
    // ─── CSS code splitting ───
    cssCodeSplit: true,
  },
})
