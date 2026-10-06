import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  resolve: {
    // pnpm 隔离的依赖位于 .pnpm 内；显式按真实路径解析，避免沿符号链接找不到传递依赖
    preserveSymlinks: false,
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
