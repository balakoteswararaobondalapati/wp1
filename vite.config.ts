import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Disable any Supabase integration during build
  define: {
    'process.env.SUPABASE_ENABLED': 'false',
    'process.env.DEPLOY_EDGE_FUNCTIONS': 'false',
    'process.env.SKIP_SUPABASE_DEPLOYMENT': 'true',
    'import.meta.env.VITE_SUPABASE_ENABLED': 'false',
  },
  build: {
    rollupOptions: {
      external: []
    }
  },
  server: {
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
})
