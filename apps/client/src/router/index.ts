import { createRouter, createWebHistory } from 'vue-router';
import { registerGuard } from './guard';
import { routes } from './routes';

/** 用户端路由实例：HTML5 history 模式 + 全局登录守卫 */
export const router = createRouter({
  history: createWebHistory(),
  routes,
});

registerGuard(router);
