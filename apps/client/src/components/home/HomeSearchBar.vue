<script setup lang="ts">
/**
 * 首页搜索条：深色切角输入框 + 客服按钮；回车触发搜索（UI 阶段 toast 反馈）。
 */
import { ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { useToast } from '@/composables/use-toast';

const keyword = ref('');
const toast = useToast();

/** 触发搜索：UI 阶段仅提示，后续接商品搜索接口 */
function onSearch() {
  toast.show(keyword.value ? `搜索「${keyword.value}」功能即将上线` : '请输入想搜索的单子');
}
</script>

<template>
  <div class="search-row">
    <div class="search-box">
      <AppIcon
        name="search"
        :size="17"
        class="icon"
      />
      <input
        v-model="keyword"
        type="text"
        placeholder="搜索你喜欢的单子"
        @keyup.enter="onSearch"
      >
    </div>
    <button
      class="service-btn"
      title="联系客服"
      @click="onSearch"
    >
      <AppIcon
        name="headset"
        :size="19"
      />
    </button>
  </div>
</template>

<style scoped>
.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  transition: border-color 0.2s ease;
}

.search-box:focus-within {
  border-color: var(--c-accent);
}

.search-box .icon {
  color: var(--c-accent);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--c-text);
}

.search-box input::placeholder {
  color: var(--c-text-muted);
}

.service-btn {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  color: var(--c-accent);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}
</style>
