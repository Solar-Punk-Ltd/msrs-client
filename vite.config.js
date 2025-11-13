import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '');

  const htmlPlugin = () => {
    return {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace('%VITE_THEME%', env.VITE_THEME || 'cryptomondays');
      },
    };
  };

  return {
    plugins: [
      nodePolyfills(),
      react(),
      htmlPlugin(),
      // Add bundle analyzer (only in analyze mode)
      // eslint-disable-next-line no-undef
      ...(process.env.ANALYZE
        ? [
            visualizer({
              open: true,
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'waku-vendor': ['@solarpunkltd/waku-sdk', '@waku/utils'],
            'swarm-vendor': ['@ethersphere/bee-js', '@solarpunkltd/swarm-chat-js'],
            'crypto-vendor': ['ethers', 'crypto-js', 'bs58'],
            'media-vendor': ['hls.js'],
            'utils-vendor': ['lodash', 'clsx', 'p-queue', 'pako', 'protobufjs', 'msgpack-lite'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
      exclude: ['node_modules', 'dist'],
    },
  };
});
