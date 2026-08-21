import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // jsdom 環境の起動が重く、並列実行時に既定の5秒では不足することがある
    testTimeout: 15000,
    include: ['tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      // この機能が所有・変更したファイルのみを対象にする。
      // api/usage/image/content は今回未変更のため対象外。
      include: [
        'src/lib/hooks.js',
        'src/lib/storage.js',
        'src/lib/persist.js',
        'src/lib/id.js',
        'src/lib/keyboard.js',
        'src/lib/cookie.js',
        'src/lib/budget.js',
        'src/lib/userId.js',
        'src/lib/usage.js',
        'src/components/UserIdCard.jsx',
        'src/components/BudgetView.jsx',
        'src/app/budget/**',
        'functions/api/_receipt.js',
        'src/components/FridgeView.jsx',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
