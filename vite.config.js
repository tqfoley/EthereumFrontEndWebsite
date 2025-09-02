import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // allow external connections
    port: 3000,      // change default from 5173 to 3000
    strictPort: true, // fail if port is in use
    allowedHosts: true
  }
});
