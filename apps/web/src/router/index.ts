import { createRouter, createWebHistory } from 'vue-router';
import { registerGuard } from './guard';
import { routes } from './routes';

/** 应用路由实例（history 模式，守卫负责鉴权与权限过滤） */
export const router = createRouter({
  // 以构建 base 作为路由前缀，支持部署在子路径（如 /admin/）
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

registerGuard(router);
