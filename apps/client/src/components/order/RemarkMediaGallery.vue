<script setup lang="ts">
/**
 * 备注附件展示：以缩略图网格展示订单备注中的图片/视频，
 * 点击图片全屏预览、视频内联播放；订单详情/大厅详情共用。
 */
import { ref } from 'vue';
import type { RemarkMediaItem } from '@app/contracts';

defineProps<{
  items: RemarkMediaItem[];
}>();

/** 当前全屏预览的图片 URL（空串 = 未预览） */
const previewUrl = ref('');
</script>

<template>
  <div class="gallery">
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <video
        v-if="item.type === 'video'"
        class="cell"
        :src="item.url"
        controls
        preload="metadata"
      />
      <button
        v-else
        class="cell cell--image"
        :style="{ backgroundImage: `url(${item.url})` }"
        aria-label="预览图片"
        @click="previewUrl = item.url"
      />
    </template>

    <div
      v-if="previewUrl"
      class="preview"
      @click="previewUrl = ''"
    >
      <img
        class="preview-img"
        :src="previewUrl"
        alt="备注图片预览"
      >
    </div>
  </div>
</template>

<style scoped>
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cell {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  background: var(--c-cover-bg);
  object-fit: cover;
}

.cell--image {
  background-size: cover;
  background-position: center;
}

.preview {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 85%);
}

.preview-img {
  max-width: 92vw;
  max-height: 88vh;
  object-fit: contain;
}
</style>
