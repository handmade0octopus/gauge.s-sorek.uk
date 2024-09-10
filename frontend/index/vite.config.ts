import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { viteSingleFile } from 'vite-plugin-singlefile';
import commonjs from 'vite-plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svelte(),
        commonjs(),
        viteStaticCopy({
           targets: [{
               src: 'node_modules/ace-builds/src-min/*',
               dest: './',
           }],
        }),
        viteSingleFile(),
    ],
    build: {
        sourcemap: true,
        assetsInlineLimit: 10 * 1024 * 1024, // 10MiB
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            }
        }
    }
})
