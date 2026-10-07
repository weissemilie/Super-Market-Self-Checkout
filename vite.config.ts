import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/Super-Market-Self-Checkout/',
  plugins: [react()],
})
