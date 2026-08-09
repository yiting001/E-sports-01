<script setup lang="ts">
/**
 * 入驻公告卡片：展示可自定义的入驻公告图片。
 * 图片由后台配置下发（BoosterMineView.onboardingNoticeImage）；
 * 支持自定义公告标题文案（默认"入驻公告说明"）。
 */
import { ref, watch } from 'vue';

const props = defineProps<{
  /** 后台配置的可自定义公告图片 URL */
  image: string;
  /** 可自定义的公告标题，默认"入驻公告说明" */
  title?: string;
}>();

const imageFailed = ref(false);

watch(
  () => props.image,
  () => {
    imageFailed.value = false;
  },
);
</script>

<template>
  <section class="announcement card">
    <h2 class="title">
      {{ title || '入驻公告说明' }}
    </h2>
    <div class="copy">
      <slot />
    </div>
    <img
      v-if="image && !imageFailed"
      :src="image"
      class="notice-image"
      alt="打手入驻公告"
      decoding="async"
      @error="imageFailed = true"
    >
    <p
      v-else-if="imageFailed"
      class="image-error"
    >
      公告图片暂时无法显示
    </p>
  </section>
</template>

<style scoped>
.announcement {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 16px;
}

.title {
  font-size: 16px;
  font-weight: 800;
}

.copy {
  font-size: 13px;
  line-height: 1.65;
  color: var(--c-text-secondary);
}

.copy strong,
.emphasis {
  color: var(--c-accent);
  font-weight: 800;
}

.notice-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: 320px;
  object-fit: contain;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
}

.image-error {
  padding: 18px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--c-text-muted);
  border: 1px dashed var(--c-border);
}
</style>
