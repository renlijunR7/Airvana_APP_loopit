import { defineConfig } from '/Users/lijunren/Documents/Codex/2026-09-05/zhi/outputs/coin-sprint/node_modules/vite/dist/node/index.js';
import react from '/Users/lijunren/Documents/Codex/2026-09-05/zhi/outputs/coin-sprint/node_modules/@vitejs/plugin-react/dist/index.js';

const sourceRoot = '/Users/lijunren/Documents/Codex/2026-09-05/zhi/outputs/coin-sprint';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'airvana-htx-quest-paths',
      enforce: 'pre',
      transform(code, id) {
        if (!id.startsWith(sourceRoot)) return null;
        return code.replaceAll('/art/', '/arcade/htx-quest/art/');
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
    outDir: '../../../public/arcade/htx-quest',
    emptyOutDir: true,
    sourcemap: false
  }
});
