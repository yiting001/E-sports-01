<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { ENV_CONFIG_MISSING } from '@/config/env';
import { useBrandingStore } from '@/stores/branding.store';
import { tenantContext } from '@/tenant/tenant-context';

onLaunch((options) => {
  // 启动自检：env 文件缺失时 import.meta.env 为空对象，请求会全部失败，直接给出可执行的修复提示
  if (ENV_CONFIG_MISSING) {
    uni.showModal({
      title: '缺少接口配置',
      content:
        'VITE_API_BASE_URL / VITE_TENANT_CODE 未配置：请在 apps/uni-esports/.env.development 或 .env.production 填写后重新构建',
      showCancel: false,
    });
    return;
  }
  // 租户编码：构建时固定（VITE_TENANT_CODE），允许扫码/场景参数 tenantCode 覆盖
  tenantContext.initialize(options?.query?.tenantCode);
  // 品牌信息用于「我的」页展示与分享文案；失败静默回退默认值
  const branding = useBrandingStore();
  void branding.load();
});
</script>

<style>
/* 全局基础样式：页面底色与文字色，与 apps/client 设计令牌一致 */
page {
  background-color: #0b0e14;
  color: #e9eef6;
  font-size: 28rpx;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* ===== 公共工具类（切角卡片 / 控件 / 文本层级），各页面直接使用 ===== */

.card {
  background-color: #131926;
  border: 1rpx solid rgba(150, 165, 195, 0.16);
  border-radius: 8rpx;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  padding: 24rpx;
  box-sizing: border-box;
}

/* ===== 按钮默认样式重置（必须先于下方按钮类） =====
   H5 端 <button> 编译为 uni-button 自定义元素，uni-h5 框架自带浅色底与
   浅色禁用态（uni-components/style/button.css），其中 [disabled]:not([type])
   选择器优先级高于页面类样式，必须以更高优先级压回深色主题 */

button,
uni-button {
  margin: 0;
  padding: 0;
  background-color: transparent;
  line-height: 1.2;
}

button::after,
uni-button::after {
  border: none;
}

/* #ifdef H5 */
uni-button:not([type]) {
  background-color: transparent;
}

uni-button[disabled]:not([type]):not([hidden]) {
  background-color: rgba(26, 33, 48, 0.6);
  color: #9aa6bb;
}
/* #endif */

/* ===== 按钮：两档高度（标准 88rpx / 紧凑 72rpx），flex 垂直居中，宽度由页面布局决定 =====
   uni-button.btn-* 变体与上方 H5 覆盖规则同优先级，靠书写顺序取胜 */

uni-button.btn-primary,
.btn-primary {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffb020;
  color: #1a1205;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 8rpx;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
}

uni-button.btn-primary.disabled,
.btn-primary.disabled {
  background-color: rgba(255, 176, 32, 0.35);
  color: rgba(26, 18, 5, 0.75);
}

uni-button.btn-ghost,
.btn-ghost {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  color: #9aa6bb;
  font-size: 30rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.3);
  border-radius: 8rpx;
}

/* 紧凑按钮：配合 fixed 宽度或行内使用（发送验证码、聊天发送等） */
.btn-sm {
  height: 72rpx;
  font-size: 26rpx;
}

/* ===== 输入控件：单行 input 用 .input，多行 textarea 用 .textarea ===== */

.input {
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #1a2130;
  border: 1rpx solid rgba(150, 165, 195, 0.16);
  border-radius: 8rpx;
  color: #e9eef6;
  font-size: 28rpx;
  box-sizing: border-box;
}

.textarea {
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  background-color: #1a2130;
  border: 1rpx solid rgba(150, 165, 195, 0.16);
  border-radius: 8rpx;
  color: #e9eef6;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
}

/* uni input/textarea 的 placeholder-class 统一走此类（全局，页面无需重复定义） */
.placeholder {
  color: #67738c;
}

/* ===== 标签签条（首页分类签、订单状态签等筛选 chip）：同一段样式保证跨页一致 ===== */

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  padding: 0 28rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
  background-color: #131926;
  flex-shrink: 0;
}

.chip.active {
  border-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.12);
}

.chip-text {
  color: #9aa6bb;
  font-size: 26rpx;
}

.chip.active .chip-text {
  color: #ffb020;
}

/* ===== 区块标题：各卡片内字段分组标题，统一字号与间距 ===== */

.section-title {
  display: block;
  color: #9aa6bb;
  font-size: 24rpx;
  margin: 24rpx 0 12rpx;
}

.section-title:first-child {
  margin-top: 0;
}

.text-secondary {
  color: #9aa6bb;
}

.text-muted {
  color: #67738c;
}

.text-accent {
  color: #ffb020;
}

.text-danger {
  color: #ff5449;
}
</style>
