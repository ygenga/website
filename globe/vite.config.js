import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "../assets/globe",
    minify: "esbuild",
    emptyOutDir: true,
    lib: { entry: "src/main.jsx", name: "GYGlobe", formats: ["iife"], fileName: () => "globe.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
