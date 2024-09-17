import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import {viteStaticCopy} from 'vite-plugin-static-copy'
import {viteSingleFile} from 'vite-plugin-singlefile';
import commonjs from 'vite-plugin-commonjs';
import babel from 'vite-plugin-babel';

export default defineConfig(({mode}) => ({
    plugins: [
        svelte(),
        commonjs(),
        viteStaticCopy({
            targets: [{
                src: 'node_modules/ace-builds/index-src-min/*',
                dest: './',
            }],
        }),
        viteSingleFile(),
        babel(),
    ],
    resolve: {
        alias: {
            '$lib': '/index-src/lib',
        }
    },
    build: {
        sourcemap: mode === 'development',
        assetsInlineLimit: Number.MAX_VALUE,
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
                ws: true,
            }
        }
    }
}));
