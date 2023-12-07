import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
// TODO(#82): remove these and the corresponding package in package.json.
import { nodePolyfills } from 'vite-plugin-node-polyfills'


export default defineConfig({
  plugins: [
    vue(),
    basicSsl(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.vue', '.tsx', '.ts', '.mjs', '.js', '.jsx', '.json', '.wasm'],
  },
  server: {
    port: 8081,
    // Our ORCID app only has a limited set of legal redirect URLs (which 
    // includes localhost:8081 but not all other ports), so fail if the desired
    // port is occupied.
    strictPort: true, 
  },
  preview: {
    port: 8082,
    // Same as above, but localhost:8082 is also legal per ORCID.
    strictPort: true,
  },
})
