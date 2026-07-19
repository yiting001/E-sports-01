<script setup lang="ts">
/** 分类和排行榜共用的商品方形缩略图，图片失败时回退封面标语。 */
import { computed, ref, watch } from 'vue';
import { resolveMediaUrl } from '@/utils/media-url';

const props = withDefaults(
  defineProps<{
    src: string;
    fallback: string;
  }>(),
  { src: '', fallback: '商品' },
);

const failed = ref(false);
const resolvedSrc = computed(() => resolveMediaUrl(props.src));

watch(
  resolvedSrc,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <span
    class="product-cover-thumb"
    aria-hidden="true"
  >
    <img
      v-if="resolvedSrc && !failed"
      :src="resolvedSrc"
      alt=""
      class="product-cover-thumb__image"
      @error="failed = true"
    >
    <span
      v-else
      class="product-cover-thumb__fallback"
    >{{ fallback || '商品' }}</span>
  </span>
</template>

<style scoped>
.product-cover-thumb {
  position: relative;
  width: var(--product-thumb-size, 68px);
  height: var(--product-thumb-size, 68px);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--c-cover-bg);
  border: 1px solid rgba(61, 255, 155, 0.5);
  clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px);
  overflow: hidden;
}

.product-cover-thumb__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.product-cover-thumb__fallback {
  max-width: 100%;
  padding: 6px;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 800;
  letter-spacing: 0;
  color: var(--c-neon);
  text-align: center;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
