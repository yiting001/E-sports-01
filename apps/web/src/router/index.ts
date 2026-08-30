import { createRouter, createWebHashHistory } from 'vue-router';
import { registerGuard } from './guard';
import { routes } from './routes';

/** 应用路由实例（hash 模式，守卫负责鉴权与权限过滤） */
export const router = createRouter({
  // 以构建 base 作为页面路径前缀，支持部署在子路径（如 /admin/），路由位于 # 之后
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

registerGuard(router);
