import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/images": "http://localhost:3001",
      "/resizeimages": "http://localhost:3001",
      "/watermarks": "http://localhost:3001",
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/images": "http://localhost:3001",
      "/resizeimages": "http://localhost:3001",
      "/watermarks": "http://localhost:3001",
    },
  },
});
