import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Architech",
        short_name: "Architech",
        description:
          "Design, break and repair system architectures. A diagramming game about load.",
        start_url: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#070a12",
        theme_color: "#070a12",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Firebase serves its sign-in pages under /__/ on this domain. The
        // offline fallback must never answer those with the app's page, or
        // returning visitors' sign-in frames load the game instead.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
    // Security-rules tests need the Firestore emulator: `pnpm test:rules`.
    exclude: ["rules-tests/**", "node_modules/**", "dist/**"],
  },
})
