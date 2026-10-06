<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useBrandingStore } from '@/stores/branding.store';
import { tenantContext } from '@/tenant/tenant-context';

onLaunch((options) => {
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

/* ===== 公共工具类（切角卡片 / 按钮 / 文本层级），各页面直接使用 ===== */

.card {
  background-color: #131926;
  border: 1rpx solid rgba(150, 165, 195, 0.16);
  border-radius: 8rpx;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  padding: 24rpx;
  box-sizing: border-box;
}

.btn-primary {
  background-color: #ffb020;
  color: #1a1205;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 8rpx;
  text-align: center;
  padding: 20rpx 0;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
}

.btn-primary.disabled {
  background-color: rgba(255, 176, 32, 0.35);
  color: rgba(26, 18, 5, 0.75);
}

.btn-ghost {
  background-color: transparent;
  color: #9aa6bb;
  font-size: 28rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.3);
  border-radius: 8rpx;
  text-align: center;
  padding: 18rpx 0;
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

/* 小程序 button 默认样式重置 */
button {
  margin: 0;
  background: transparent;
}

button::after {
  border: none;
}

.input {
  background-color: #1a2130;
  border: 1rpx solid rgba(150, 165, 195, 0.16);
  border-radius: 8rpx;
  color: #e9eef6;
  font-size: 28rpx;
  padding: 18rpx 20rpx;
  box-sizing: border-box;
}
</style>
