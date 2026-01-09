import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/', // Для duckdns лучше использовать корень
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Разделяем библиотеки и наш код для стабильности
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})