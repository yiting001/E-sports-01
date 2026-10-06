<template>
  <view class="empty">
    <view class="empty-glyph">
      <text class="empty-mark">
        △
      </text>
    </view>
    <text class="empty-text">
      {{ text }}
    </text>
    <view
      v-if="actionText"
      class="empty-action"
      @tap="onAction"
    >
      <text class="empty-action-text">
        {{ actionText }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  text: string;
  actionText?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();

function onAction(): void {
  emit('action');
}
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-glyph {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(150, 165, 195, 0.2);
  border-radius: 50%;
  margin-bottom: 24rpx;
}

.empty-mark {
  color: #67738c;
  font-size: 48rpx;
}

.empty-text {
  color: #67738c;
  font-size: 26rpx;
}

.empty-action {
  margin-top: 32rpx;
  padding: 14rpx 48rpx;
  border: 1rpx solid rgba(255, 176, 32, 0.5);
  border-radius: 8rpx;
}

.empty-action-text {
  color: #ffb020;
  font-size: 26rpx;
}
</style>
