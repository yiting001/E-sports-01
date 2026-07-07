<script setup lang="ts">
/**
 * 用户协议弹层（C 端 · 登录/注册页用）。
 * 打开时惰性拉取后台配置的协议正文（富文本），DOMPurify 消毒后渲染；
 * 未配置时展示占位提示。通过 v-model:open 控制显隐。
 */
import DOMPurify from 'dompurify';
import { ref, watch } from 'vue';
import { authApi } from '@/api/auth.api';

const open = defineModel<boolean>('open', { required: true });

const loading = ref(false);
const loaded = ref(false);
const safeContent = ref('');

/** 首次打开时拉取协议正文并消毒缓存，后续打开直接复用 */
watch(open, async (value) => {
  if (!value || loaded.value || loading.value) {
    return;
  }
  loading.value = true;
  try {
    const { contentHtml } = await authApi.agreement();
    safeContent.value = DOMPurify.sanitize(contentHtml);
    loaded.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="agreement-mask"
      @click.self="open = false"
    >
      <div class="agreement-panel">
        <header class="agreement-head">
          <span class="agreement-title">用户协议</span>
          <button
            class="agreement-close"
            aria-label="关闭"
            @click="open = false"
          >
            ✕
          </button>
        </header>
        <div class="agreement-body">
          <p
            v-if="loading"
            class="agreement-hint"
          >
            加载中…
          </p>
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-else-if="safeContent"
            class="agreement-content"
            v-html="safeContent"
          />
          <!-- eslint-enable vue/no-v-html -->
          <p
            v-else
            class="agreement-hint"
          >
            暂未配置用户协议内容
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.agreement-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 60%);
}

.agreement-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 78vh;
  overflow: hidden;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 16px 16px 0 0;
}

.agreement-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
}

.agreement-title {
  font-size: 15px;
  font-weight: 600;
}

.agreement-close {
  padding: 4px 8px;
  font-size: 14px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
}

.agreement-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.agreement-hint {
  margin: 24px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  text-align: center;
}

.agreement-content {
  font-size: 13px;
  line-height: 1.8;
  color: var(--c-text-secondary);
  overflow-wrap: break-word;
}

.agreement-content :deep(img) {
  max-width: 100%;
}
</style>
