<template>
  <view
    v-if="open"
    class="sheet"
    @tap="close"
  >
    <!-- 背景遮罩单独一层：只在这里拦截滑动，避免弹层内滚动被一起挡掉 -->
    <view
      class="sheet-backdrop"
      @touchmove.stop.prevent="noop"
    />
    <view
      class="sheet-panel"
      @tap.stop
    >
      <view class="sheet-head">
        <text class="type-label sheet-title">{{ title }}</text>
        <text class="sheet-close" @tap="close">关闭</text>
      </view>
      <view class="hairline" />
      <scroll-view
        scroll-y
        class="sheet-body"
        :show-scrollbar="false"
      >
        <slot />
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 底部弹层（公告、协议等长内容共用）。
 * Runway 风格：遮罩纯黑半透明、面板 Dark Surface + 极细描边、零阴影，标题走大写标签字阶。
 */
defineProps<{
  /** 是否展示 */
  open: boolean;
  /** 弹层标题（大写标签字阶） */
  title: string;
}>();

const emit = defineEmits<{ close: [] }>();

function close(): void {
  emit('close');
}

/** 仅用于拦截遮罩上的滑动，避免弹层打开时背景页面跟着滚动 */
function noop(): void {
  // 空实现：阻止默认行为即可
}
</script>

<style scoped>
/* z-index 必须高于 H5 的 uni-tabbar（998），否则 tab 页上弹层底部会被标签栏压住 */
.sheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.sheet-backdrop {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.72);
}

.sheet-panel {
  position: relative;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: var(--c-surface);
  border-top: 1rpx solid var(--c-border);
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 24rpx;
}

.sheet-title {
  color: var(--c-text);
}

.sheet-close {
  color: var(--c-text-secondary);
  font-size: 24rpx;
  letter-spacing: 0.7rpx;
  text-transform: uppercase;
}

.sheet-body {
  max-height: 60vh;
  padding: 32rpx;
  box-sizing: border-box;
}
</style>
