import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ _mode }) => {
  // eslint-disable-next-line no-undef
  const env = process.env;
  const activeTheme = env.VITE_THEME || 'solarpunk';

  return {
    plugins: [nodePolyfills(), react()],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `$active-theme: '${activeTheme}';`,
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
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: `assets/[name].[ext]`,
        },
      },
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
