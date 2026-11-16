import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      quoteStyle: "double",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/quiz": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/teacher": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/institution-detail": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/student-directory": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/ops": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/sales": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/product": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/session-today": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/requirements-board": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/receipts": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/lti": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
