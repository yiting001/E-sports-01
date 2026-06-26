import { createRouter, createWebHistory } from 'vue-router';
import { registerGuard } from './guard';
import { routes } from './routes';

/** 应用路由实例（history 模式，守卫负责鉴权与权限过滤） */
export const router = createRouter({
  history: createWebHistory(),
  routes,
});

registerGuard(router);
