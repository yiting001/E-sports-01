<script setup lang="ts">
/**
 * 聊天媒体消息：图片/视频以固定尺寸缩略展示，点击弹出全屏预览
 * （图片原图 / 视频带控制条播放），点遮罩关闭。
 */
import { ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';

defineProps<{ type: 'image' | 'video'; url: string }>();

const previewing = ref(false);
</script>

<template>
  <button
    class="thumb"
    :aria-label="type === 'image' ? '查看图片' : '播放视频'"
    @click="previewing = true"
  >
    <img
      v-if="type === 'image'"
      :src="url"
      class="thumb-media"
      alt="图片消息"
    >
    <template v-else>
      <video
        :src="url"
        class="thumb-media"
        preload="metadata"
        muted
      />
      <span class="play">
        <AppIcon
          name="video"
          :size="22"
        />
      </span>
    </template>
  </button>

  <Teleport to="body">
    <div
      v-if="previewing"
      class="mask"
      @click.self="previewing = false"
    >
      <img
        v-if="type === 'image'"
        :src="url"
        class="full"
        alt="图片预览"
      >
      <video
        v-else
        :src="url"
        class="full"
        controls
        autoplay
      />
      <button
        class="close"
        aria-label="关闭预览"
        @click="previewing = false"
      >
        ✕
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.thumb {
  position: relative;
  display: block;
  width: 160px;
  height: 120px;
  padding: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: zoom-in;
}

.thumb-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
}

.play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.85);
}

.full {
  max-width: 92vw;
  max-height: 86vh;
  border-radius: var(--radius-sm);
}

.close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-size: 16px;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 50%;
}
</style>
