import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/recruitment-scheduler/', // Change this to match your GitHub repo name
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
