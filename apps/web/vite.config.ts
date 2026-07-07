import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Vite 配置。
 * 仅声明插件与路径别名，端口/接口地址等均通过 .env 注入，避免硬编码。
 * 部署子路径（如单域名下的 /admin/）由 VITE_BASE 环境变量指定，默认根路径。
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
