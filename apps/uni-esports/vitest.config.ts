import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * 单测专用配置：不加载 uni 插件（仅测纯函数与可 mock 模块）。
 * `pnpm test` 与 `pnpm vitest run` 均自动读取本文件。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
