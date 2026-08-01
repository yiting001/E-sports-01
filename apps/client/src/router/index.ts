import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import { registerAuthGuard } from './guard';
import { useBrandingStore } from '@/stores/branding.store';

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
      path: '/orders/:id',
      name: 'order-detail',
      component: () => import('@/views/order/OrderDetailView.vue'),
      meta: { title: '订单详情', requiresAuth: true },
    },
    {
      path: '/hall/:id',
      name: 'hall-order-detail',
      component: () => import('@/views/order/HallOrderDetailView.vue'),
      meta: { title: '订单详情', requiresAuth: true },
    },
    {
      path: '/booster/orders/:id',
      name: 'booster-order-detail',
      component: () => import('@/views/order/BoosterOrderDetailView.vue'),
      meta: { title: '订单详情', requiresAuth: true },
    },
    {
      path: '/chat/:id',
      name: 'chat',
      component: () => import('@/views/message/ChatView.vue'),
      meta: { title: '会话聊天', requiresAuth: true },
    },
    {
      path: '/profile/edit',
      name: 'profile-edit',
      component: () => import('@/views/profile/ProfileEditView.vue'),
      meta: { title: '个人信息', requiresAuth: true },
    },
    {
      path: '/coupons/center',
      name: 'coupon-center',
      component: () => import('@/views/coupon/CouponCenterView.vue'),
      meta: { title: '领券中心', requiresAuth: true },
    },
    {
      path: '/coupons/mine',
      name: 'my-coupons',
      component: () => import('@/views/coupon/MyCouponsView.vue'),
      meta: { title: '我的优惠券', requiresAuth: true },
    },
    {
      path: '/coupons/share',
      name: 'coupon-share',
      component: () => import('@/views/coupon/CouponShareView.vue'),
      meta: { title: '推广发券', requiresAuth: true },
    },
    {
      path: '/coupons/claim/:code',
      name: 'coupon-claim',
      component: () => import('@/views/coupon/CouponClaimByCodeView.vue'),
      meta: { title: '领取优惠券', requiresAuth: true },
    },
    {
      path: '/invite',
      name: 'invite',
      component: () => import('@/views/invite/InviteView.vue'),
      meta: { title: '邀请好友', requiresAuth: true },
    },
    {
      path: '/member/levels',
      name: 'member-levels',
      component: () => import('@/views/member/MemberLevelsView.vue'),
      meta: { title: '会员等级', requiresAuth: true },
    },
    {
      path: '/rank',
      name: 'rank',
      component: () => import('@/views/rank/RankView.vue'),
      meta: { title: '排行榜', requiresAuth: true },
    },
    {
      path: '/activities',
      name: 'activities',
      component: () => import('@/views/activity/ActivityListView.vue'),
      meta: { title: '福利活动', requiresAuth: true },
    },
    {
      path: '/activities/:id',
      name: 'activity-detail',
      component: () => import('@/views/activity/ActivityDetailView.vue'),
      meta: { title: '活动详情', requiresAuth: true },
    },
    {
      path: '/build',
      name: 'build-intro',
      component: () => import('@/views/profile/BuildIntroView.vue'),
      meta: { title: '搭建同款电竞系统' },
    },
    {
      path: '/profile/realname',
      name: 'realname',
      component: () => import('@/views/profile/RealnameView.vue'),
      meta: { title: '实名认证', requiresAuth: true },
    },
    {
      path: '/profile/notify',
      name: 'notify-settings',
      component: () => import('@/views/profile/NotifySettingsView.vue'),
      meta: { title: '通知设置', requiresAuth: true },
    },
    {
      path: '/profile/booster',
      name: 'booster-apply',
      component: () => import('@/views/profile/BoosterApplyView.vue'),
      meta: { title: '打手入驻', requiresAuth: true },
    },
    {
      path: '/boosters',
      name: 'booster-list',
      component: () => import('@/views/booster/BoosterListView.vue'),
      meta: { title: '挑选打手', requiresAuth: true },
    },
    {
      path: '/boosters/:userId',
      name: 'booster-profile',
      component: () => import('@/views/booster/BoosterProfileView.vue'),
      meta: { title: '打手主页', requiresAuth: true },
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

/** 每次导航后同步页面标题（软件名称来自配置中心品牌配置），便于多标签页区分 */
router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  useBrandingStore().setPageTitle(title ?? '');
});
