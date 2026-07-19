<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  image: string;
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
      入驻公告说明
    </h2>
    <div class="copy">
      <p>
        搜索 <strong>怪兽三角洲俱乐部</strong> 微信公众号
      </p>
      <p>点击审核入驻进入审核群审核</p>
      <p>如果过期或者不会请联系客服</p>
      <p>客服会帮你解决</p>
      <p class="emphasis">
        截屏扫码关注服务号！
      </p>
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
