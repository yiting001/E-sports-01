<script lang="ts">
import { ENV_CONFIG_MISSING } from '@/config/env';
import { tenantContext } from '@/tenant/tenant-context';
import { branding } from '@/stores/branding';
import { im } from '@/stores/im';
import { portal } from '@/stores/portal';
import { tokenStorage } from '@/api/token-storage';

export default {
  onLaunch(options?: { query?: Record<string, string> }) {
    // 启动自检：env 文件缺失时 import.meta.env 取不到值、请求会全部失败，先给出可执行的修复提示
    if (ENV_CONFIG_MISSING) {
      uni.showModal({
        title: '缺少接口配置',
        content:
          'VITE_API_BASE_URL / VITE_TENANT_CODE 未配置：请在 .env（或 .env.development / .env.production）填写后重新运行',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    // 租户编码：构建时固定（VITE_TENANT_CODE），允许扫码/场景参数 tenantCode 覆盖
    tenantContext.initialize(options?.query?.tenantCode);
    // 品牌与门户开关为公开配置，启动即拉取，失败静默回退默认值
    void branding.load();
    void portal.load();
    // 已有登录态时建立 IM 长连接（未登录时由登录成功后建立）
    if (tokenStorage.getAccess()) {
      im.ensureConnected();
    }
  },
  onShow() {},
  onHide() {},
};
</script>

<style>
/**
 * 全局基础样式：Runway 设计系统（深色电影感、影像优先、界面近乎隐形）。
 * 令牌集中在 page 上，组件与页面都用 var() 消费，禁止各页散落硬编码色值。
 * 原则：零阴影、极细描边（#27272a）、微圆角（非胶囊）、无装饰色——色彩只来自影像内容。
 */
page {
  /* 色彩：以 #000 为主，Dark Surface 承载强调卡，Cool Slate 系列承载次级文字 */
  --c-bg: #000000;
  --c-surface: #1a1a1a;
  --c-border: #27272a;
  --c-text: #ffffff;
  --c-text-secondary: #767d88;
  --c-text-tertiary: #7d848e;
  --c-text-muted: #a7a7a7;
  --c-silver: #c9ccd1;
  --c-charcoal: #404040;
  /* 影像上的文字遮罩（Runway 允许的唯一渐变：图片可读性遮罩） */
  --c-scrim: rgba(0, 0, 0, 0.55);
  /* 圆角：4/6/8/16px，微圆角几何 */
  --radius-xs: 8rpx;
  --radius-sm: 12rpx;
  --radius-md: 16rpx;
  --radius-lg: 32rpx;
  /* 字体：单一无衬线（abcNormal 的等价替身 Inter/DM Sans，中文回退系统黑体） */
  --font-sans: 'Inter', 'DM Sans', -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --font-num: 'DM Sans', 'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif;

  background-color: var(--c-bg);
  color: var(--c-text);
  font-family: var(--font-sans);
  font-size: 28rpx;
  line-height: 1.45;
}

/* ===== 字阶：紧排 + 负字距；标签大写 + 正字距 ===== */

/* 展示级标题（48px 级）：line-height 1.0 + -1.2px 负字距，电影标题密度 */
.type-display {
  font-size: 64rpx;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -1.2px;
}

/* 区块标题（36-40px 级） */
.type-headline {
  font-size: 48rpx;
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.9px;
}

/* 卡片标题（24px 级） */
.type-title {
  font-size: 34rpx;
  font-weight: 400;
  line-height: 1.1;
}

/* 正文（16px 级）：紧排、微负字距 */
.type-body {
  font-size: 28rpx;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: -0.16px;
}

/* 说明文字（13-14px 级） */
.type-small {
  font-size: 24rpx;
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: -0.16px;
}

/* 标签（11-14px 级）：大写 + 0.35px 正字距，承担导航性结构 */
.type-label {
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.7rpx;
  text-transform: uppercase;
  color: var(--c-text-secondary);
}

/* 数字：金额/等级等需要等宽感的数据 */
.type-num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.text-muted {
  color: var(--c-text-secondary);
}

.text-faint {
  color: var(--c-text-tertiary);
}

.text-dim {
  color: var(--c-text-muted);
}

.text-strong {
  color: var(--c-text);
}

/* ===== 容器：影像优先，界面退后 ===== */

/* 页面边距：16px 常规留白（Runway 内容区居中、留白充裕） */
.page {
  min-height: 100vh;
  padding: 24rpx 32rpx 64rpx;
  box-sizing: border-box;
}

/* 极细描边容器：1px #27272a，零阴影 */
.card {
  padding: 32rpx;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-md);
  background-color: transparent;
  box-sizing: border-box;
}

/* 强调卡：Dark Surface 承载（会员/余额等需要与影像区分的容器） */
.card-solid {
  background-color: var(--c-surface);
}

/* 分隔线：1px Cool Silver/深描边，几乎不可见 */
.hairline {
  height: 1rpx;
  background-color: var(--c-border);
}

/* ===== 交互控件 ===== */

/* mp 与 H5 的 button 默认样式重置（页面类样式随后覆盖） */
button {
  margin: 0;
  padding: 0;
  background-color: transparent;
  border-radius: 0;
  font-size: inherit;
  color: inherit;
  line-height: 1.3;
  text-align: inherit;
}

button::after {
  border: none;
}

/* 主操作：纯白底黑字（Runway 界面无色相，白色即强调） */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background-color: var(--c-text);
  color: #000000;
  font-size: 28rpx;
  font-weight: 600;
  letter-spacing: 0.35px;
  border-radius: var(--radius-xs);
}

.btn-primary.is-disabled {
  background-color: rgba(255, 255, 255, 0.35);
  color: rgba(0, 0, 0, 0.75);
}

/* 次级操作：透明底 + 极细描边 */
.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border: 1rpx solid var(--c-border);
  color: var(--c-text-muted);
  font-size: 28rpx;
  font-weight: 500;
  border-radius: var(--radius-xs);
}

/* 纯文字按钮 */
.btn-text {
  display: inline-flex;
  align-items: center;
  color: var(--c-text);
  font-size: 24rpx;
  font-weight: 500;
}

.btn-text.is-disabled {
  color: var(--c-text-tertiary);
}

/* 输入框：暗底 + 极细描边，聚焦不加亮色（界面隐身） */
.input {
  width: 100%;
  height: 88rpx;
  padding: 0 28rpx;
  background-color: var(--c-surface);
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text);
  font-size: 28rpx;
  box-sizing: border-box;
}

.placeholder {
  color: var(--c-text-tertiary);
}

/* ===== 影像：满幅、8px 圆角，零阴影 ===== */

.media {
  display: block;
  width: 100%;
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
}

/* 空状态：仅文字，无插画（界面不做装饰） */
.empty {
  padding: 96rpx 32rpx;
  text-align: center;
  color: var(--c-text-tertiary);
  font-size: 26rpx;
}

/* #ifdef H5 */
/* H5 的 page 选择器不覆盖整页容器；短内容页底部会露出浏览器默认底色，这里统一压成 Runway Black */
body,
uni-page-wrapper,
uni-page-body {
  background-color: #000000;
}
/* #endif */
</style>
