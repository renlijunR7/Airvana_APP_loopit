import { defineConfig } from '/Users/lijunren/Documents/Codex/2026-09-07/can-k/work/fruit-arcade/node_modules/vite/dist/node/index.js';
import react from '/Users/lijunren/Documents/Codex/2026-09-07/can-k/work/fruit-arcade/node_modules/@vitejs/plugin-react/dist/index.js';

const sourceRoot = '/Users/lijunren/Documents/Codex/2026-09-07/can-k/work/fruit-arcade';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'airvana-lucky-fruit-paths',
      enforce: 'pre',
      transform(code, id) {
        if (!id.startsWith(sourceRoot)) return null;
        return code
          .replaceAll('/assets/reference-fruit-machine.png', '/arcade/lucky-fruit/assets/reference-fruit-machine.png')
          .replaceAll('href="/"', 'href="/arcade/lucky-fruit/"');
      }
    }
  ],
  resolve: {
    alias: {
      '@': sourceRoot,
      react: sourceRoot + '/node_modules/react',
      'react-dom': sourceRoot + '/node_modules/react-dom',
      'lucide-react': sourceRoot + '/node_modules/lucide-react'
    },
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: '../../../public/arcade/lucky-fruit',
    emptyOutDir: true,
    sourcemap: false
  }
});
