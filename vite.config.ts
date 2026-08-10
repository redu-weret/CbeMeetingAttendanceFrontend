import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Bind to 0.0.0.0 so devices on the same network can connect
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5151',
        changeOrigin: true,
        secure: false,
      },
      // Serve uploaded profile pictures from the backend's wwwroot/Profiles
      '/Profiles': {
        target: 'http://localhost:5151',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
