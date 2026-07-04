import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';

/**
 * 路由表：四个一级 Tab 页挂在主布局下。
 * 页面组件按需懒加载，避免首屏包体膨胀。
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/home/HomeView.vue'),
          meta: { title: '首页' },
        },
        {
          path: 'category',
          name: 'category',
          component: () => import('@/views/category/CategoryView.vue'),
          meta: { title: '分类' },
        },
        {
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/message/MessageView.vue'),
          meta: { title: '消息' },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/profile/ProfileView.vue'),
          meta: { title: '我的' },
        },
      ],
    },
  ],
});

/** 每次导航后同步页面标题，便于多标签页区分 */
router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} · 电竞陪练商城` : '电竞陪练商城';
});
