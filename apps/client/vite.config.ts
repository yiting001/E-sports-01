import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Vite 配置（C 端商城前端）。
 * 仅声明插件与路径别名，接口地址等运行参数通过 .env 注入，避免硬编码。
 * 端口默认 5174（与管理端 5173 并行），可由 PORT 环境变量覆盖。
 */
const DEFAULT_DEV_PORT = 5174;
const DEFAULT_BACKEND_PROXY_TARGET = 'http://127.0.0.1:3000';
const backendProxyTarget = process.env.VITE_PROXY_TARGET ?? DEFAULT_BACKEND_PROXY_TARGET;
const staticProxy = { target: backendProxyTarget, changeOrigin: true };

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.PORT) || DEFAULT_DEV_PORT,
    proxy: { '/static': staticProxy },
  },
  preview: { proxy: { '/static': staticProxy } },
});
