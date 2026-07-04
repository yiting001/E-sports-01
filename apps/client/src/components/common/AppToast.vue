<script setup lang="ts">
/**
 * 全局轻提示组件：读取 useToast 单例状态，居中浮层展示（深色切角面板）。
 */
import { useToast } from '@/composables/use-toast';

const { message, visible } = useToast();
</script>

<template>
  <transition name="toast-fade">
    <div
      v-if="visible"
      class="toast"
    >
      {{ message }}
    </div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 20%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 10px 18px;
  background: rgba(26, 33, 48, 0.96);
  border: 1px solid var(--c-accent-dim);
  border-left: 3px solid var(--c-accent);
  color: var(--c-text);
  font-size: 14px;
  max-width: 80vw;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
