import { internalIpV4Sync } from "internal-ip";
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { version, dnaVersion } from './package.json';  // Import version from package.json

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 1420,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: internalIpV4Sync(),
      port: 1421,
    },
    watch: {
      usePolling: true
    }
  },
  plugins: [svelte()],
  build: {
    minify: false
  },
  define: {
    '__APP_VERSION__': JSON.stringify(version),  // Define a global constant
    '__DNA_VERSION__': JSON.stringify(dnaVersion)  // Define a global constant
  },
});

