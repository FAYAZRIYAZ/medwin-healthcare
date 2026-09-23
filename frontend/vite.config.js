import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://medwin-api.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // GitHub Pages serves the project from this repository subpath.
  // eslint-disable-next-line no-undef
  base: process.env.GITHUB_ACTIONS ? '/medwin-healthcare/' : '/',
})
