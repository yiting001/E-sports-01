import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Vite 配置（用户端）。
 * 仅声明插件与路径别名；端口/接口地址等均通过 .env 注入，避免硬编码。
 * 端口取 5174，与管理端（@app/web，5173）并行开发互不冲突。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
  },
});
