import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // allow external connections
    port: 3000,      // change default from 5173 to 3000
    strictPort: true, // fail if port is in use
    allowedHosts: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        uniswap: resolve(__dirname, 'uniswap.html'),
        sendonbase: resolve(__dirname, 'sendonbase.html')
      }
    }
  }
});
