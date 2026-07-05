import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import { registerAuthGuard } from './guard';

/**
 * 路由表：登录页独立于主布局全屏展示；四个一级 Tab 页挂在主布局下。
 * 页面组件按需懒加载，避免首屏包体膨胀。
 * 需登录的页面通过 meta.requiresAuth 声明，具体拦截逻辑见 guard.ts。
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/service',
      name: 'service',
      component: () => import('@/views/message/ServiceChatView.vue'),
      meta: { title: '在线客服', requiresAuth: true },
    },
    {
      path: '/feedback',
      name: 'feedback',
      component: () => import('@/views/feedback/FeedbackView.vue'),
      meta: { title: '投诉反馈', requiresAuth: true },
    },
    {
      path: '/notices',
      name: 'notices',
      component: () => import('@/views/notice/NoticeListView.vue'),
      meta: { title: '平台通知' },
    },
    {
      path: '/notices/:id',
      name: 'notice-detail',
      component: () => import('@/views/notice/NoticeDetailView.vue'),
      meta: { title: '通知详情' },
    },
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('@/views/product/ProductDetailView.vue'),
      meta: { title: '商品详情' },
    },
    {
      path: '/checkout/:productId',
      name: 'checkout',
      component: () => import('@/views/order/CheckoutView.vue'),
      meta: { title: '确认下单', requiresAuth: true },
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: () => import('@/views/wallet/WalletView.vue'),
      meta: { title: '我的钱包', requiresAuth: true },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/order/MyOrdersView.vue'),
      meta: { title: '我的订单', requiresAuth: true },
    },
    {
      path: '/profile/edit',
      name: 'profile-edit',
      component: () => import('@/views/profile/ProfileEditView.vue'),
      meta: { title: '个人信息', requiresAuth: true },
    },
    {
      path: '/profile/booster',
      name: 'booster-apply',
      component: () => import('@/views/profile/BoosterApplyView.vue'),
      meta: { title: '打手入驻', requiresAuth: true },
    },
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
          path: 'hall',
          name: 'hall',
          component: () => import('@/views/order/HallView.vue'),
          meta: { title: '接单大厅', requiresAuth: true },
        },
        {
          path: 'booster-orders',
          name: 'booster-orders',
          component: () => import('@/views/order/BoosterOrdersView.vue'),
          meta: { title: '订单中心', requiresAuth: true },
        },
        {
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/message/MessageView.vue'),
          meta: { title: '消息', requiresAuth: true },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/profile/ProfileView.vue'),
          meta: { title: '我的', requiresAuth: true },
        },
      ],
    },
  ],
});

registerAuthGuard(router);

/** 每次导航后同步页面标题，便于多标签页区分 */
router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} · 电竞陪练商城` : '电竞陪练商城';
});
