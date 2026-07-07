<script setup lang="ts">
/**
 * 首页运营横幅：后台配置了横幅图则展示该图片（可在管理端随时更换）；
 * 未配置时不渲染任何内容。
 */
import { onMounted, ref } from 'vue';
import { noticeApi } from '@/api/notice.api';

/** 后台配置的横幅图 URL；空串表示未配置，不展示横幅 */
const image = ref('');

onMounted(async () => {
  try {
    image.value = (await noticeApi.getBanner()).image;
  } catch {
    // 拉取失败时静默隐藏横幅，不阻断首页渲染
  }
});
</script>

<template>
  <div
    v-if="image"
    class="banner-image card"
  >
    <img
      :src="image"
      alt="运营横幅"
    >
  </div>
</template>

<style scoped>
.banner-image {
  overflow: hidden;
  line-height: 0;
}

.banner-image img {
  width: 100%;
  /* 固定横幅比例，超出裁剪，避免原图过大撑开首页 */
  aspect-ratio: 21 / 9;
  max-height: 160px;
  display: block;
  object-fit: cover;
}
</style>
