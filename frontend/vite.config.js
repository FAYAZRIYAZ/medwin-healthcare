import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the project from this repository subpath.
  // eslint-disable-next-line no-undef
  base: process.env.GITHUB_ACTIONS ? '/medwin-healthcare/' : '/',
})
