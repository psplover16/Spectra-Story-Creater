import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'

const srcAlias = {
  '@': path.resolve(__dirname, 'src'),
}

const nodeExternals = ['electron', 'node:fs', 'node:fs/promises', 'node:path', 'node:url', 'node:os', 'node:crypto']

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          resolve: { alias: srcAlias },
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/main.ts',
              formats: ['cjs'],
              fileName: () => 'main.cjs',
            },
            rollupOptions: {
              external: nodeExternals,
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          resolve: { alias: srcAlias },
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: nodeExternals,
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs',
                inlineDynamicImports: true,
              },
            },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: srcAlias,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
