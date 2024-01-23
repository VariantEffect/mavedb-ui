import {fileURLToPath, URL} from 'node:url'
import {resolve} from 'path'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'


export default defineConfig({
  plugins: [
    vue(),
    basicSsl(),
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
  build: {
    rollupOptions: {
      input: {
        'index': resolve(__dirname, 'index.html'),
        'signed-in': resolve(__dirname, 'signed-in.html'),
        'signed-out': resolve(__dirname, 'signed-out.html'),
      },
    },
  },
})
