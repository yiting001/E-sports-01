<script setup lang="ts">
/**
 * 首页运营横幅：后台配置了横幅图则直接展示该图片（可在管理端随时更换）；
 * 未配置时回退默认样式：深色碳纤面板 + 战术金斜体标语 + 右侧金框二维码位。
 */
import { onMounted, ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { HOME_BANNER } from '@/config/home.mock';
import { noticeApi } from '@/api/notice.api';
import { useToast } from '@/composables/use-toast';

const toast = useToast();

/** 后台配置的横幅图 URL；空串表示未配置，回退默认样式 */
const image = ref('');

onMounted(async () => {
  try {
    image.value = (await noticeApi.getBanner()).image;
  } catch {
    // 拉取失败时静默回退默认样式，不阻断首页渲染
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
  <div
    v-else
    class="banner card"
    @click="toast.show('推广详情即将上线')"
  >
    <span class="stripes" />
    <div class="left">
      <p class="title">
        {{ HOME_BANNER.title }}
      </p>
      <p class="sub">
        {{ HOME_BANNER.subTitle }}
      </p>
      <div class="tags">
        <span class="tag gold">{{ HOME_BANNER.tagLeft }}</span>
        <span class="tag red">{{ HOME_BANNER.tagRight }}</span>
      </div>
      <p class="contact">
        {{ HOME_BANNER.contact }}
      </p>
    </div>
    <div class="right">
      <div class="qr">
        <AppIcon
          name="qr"
          :size="44"
        />
      </div>
      <span class="scan-tip">{{ HOME_BANNER.scanTip }} ▸▸▸</span>
    </div>
  </div>
</template>

<style scoped>
.banner-image {
  overflow: hidden;
  line-height: 0;
}

.banner-image img {
  width: 100%;
  display: block;
  object-fit: cover;
}

.banner {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  overflow: hidden;
}

/* 右上角战术斜纹装饰 */
.stripes {
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 8px;
  background: repeating-linear-gradient(
    -45deg,
    var(--c-accent) 0 6px,
    transparent 6px 14px
  );
  opacity: 0.7;
}

.title {
  font-size: 22px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: 1px;
  color: var(--c-accent);
  text-shadow: 0 0 18px rgba(255, 176, 32, 0.35);
}

.sub {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  font-style: italic;
  color: var(--c-text);
}

.tags {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.tag {
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
}

.tag.gold {
  background: var(--c-accent-dim);
  color: var(--c-accent);
}

.tag.red {
  background: var(--c-danger);
  color: #fff;
}

.contact {
  margin-top: 10px;
  font-size: 15px;
  font-weight: 800;
  color: var(--c-text);
}

.right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
}

.qr {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  color: var(--c-accent);
  border: 1px solid var(--c-accent-dim);
  background: rgba(255, 176, 32, 0.06);
}

.scan-tip {
  font-size: 11px;
  font-weight: 700;
  color: var(--c-text-secondary);
}
</style>
