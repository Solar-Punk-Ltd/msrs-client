import basicSsl from '@vitejs/plugin-basic-ssl';
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
    server: {
      host: true,
    },
    plugins: [
      nodePolyfills(),
      react(),
      basicSsl(),
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
          manualChunks(id) {
            // React and routing
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router')
            ) {
              return 'react-vendor';
            }
            // Waku
            if (id.includes('@solarpunkltd/waku-sdk') || id.includes('@waku/utils')) {
              return 'waku-vendor';
            }
            // Swarm
            if (id.includes('@ethersphere/bee-js') || id.includes('@solarpunkltd/swarm-chat-js')) {
              return 'swarm-vendor';
            }
            // Crypto
            if (
              id.includes('node_modules/ethers') ||
              id.includes('node_modules/crypto-js') ||
              id.includes('node_modules/bs58') ||
              id.includes('node_modules/buffer') ||
              id.includes('node_modules/process')
            ) {
              return 'crypto-vendor';
            }
            // Media
            if (id.includes('node_modules/hls.js')) {
              return 'media-vendor';
            }
            // Utils
            if (
              id.includes('node_modules/lodash') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/p-queue') ||
              id.includes('node_modules/pako') ||
              id.includes('node_modules/protobufjs') ||
              id.includes('node_modules/msgpack-lite')
            ) {
              return 'utils-vendor';
            }
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
