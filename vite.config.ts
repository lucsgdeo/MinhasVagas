import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `base` relativo: o GitHub Pages serve o site em /MinhasVagas/, não na raiz.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
});
