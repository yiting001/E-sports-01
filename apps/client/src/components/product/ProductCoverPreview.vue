<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import AppIcon from "@/components/common/AppIcon.vue";

const props = defineProps<{
  src: string;
  alt: string;
}>();

const failed = ref(false);
const previewing = ref(false);
const triggerButton = ref<HTMLButtonElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);

watch(
  () => props.src,
  () => {
    failed.value = false;
    previewing.value = false;
  }
);

async function openPreview(): Promise<void> {
  if (!props.src || failed.value) {
    return;
  }
  previewing.value = true;
  await nextTick();
  closeButton.value?.focus();
}

async function closePreview(): Promise<void> {
  previewing.value = false;
  await nextTick();
  triggerButton.value?.focus();
}

function handleError(): void {
  failed.value = true;
  previewing.value = false;
}
</script>

<template>
  <div class="product-cover-preview">
    <button
      v-if="src && !failed"
      ref="triggerButton"
      type="button"
      class="product-cover-preview__trigger"
      aria-label="预览商品主图"
      aria-haspopup="dialog"
      @click="openPreview"
    >
      <img
        :src="src"
        :alt="alt"
        class="product-cover-preview__image"
        decoding="async"
        @error="handleError"
      >
    </button>
    <AppIcon
      v-else
      name="gem"
      :size="72"
      class="product-cover-preview__emblem"
    />

    <Teleport to="body">
      <div
        v-if="previewing"
        class="product-cover-preview__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="商品主图预览"
        @click.self="closePreview"
        @keydown.esc="closePreview"
      >
        <img
          :src="src"
          :alt="`${alt}预览`"
          class="product-cover-preview__full"
          @error="handleError"
        >
        <button
          ref="closeButton"
          type="button"
          class="product-cover-preview__close"
          aria-label="关闭图片预览"
          title="关闭图片预览"
          @click="closePreview"
        >
          <AppIcon
            name="close"
            :size="22"
          />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.product-cover-preview {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background: var(--c-cover-bg);
  overflow: hidden;
}

.product-cover-preview::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  height: 34%;
  pointer-events: none;
  content: "";
  background: linear-gradient(180deg, transparent, rgba(11, 14, 20, 0.55));
}

.product-cover-preview__trigger {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  cursor: zoom-in;
}

.product-cover-preview__trigger:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: -3px;
}

.product-cover-preview__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  object-position: center;
}

.product-cover-preview__emblem {
  color: rgba(61, 255, 155, 0.55);
  filter: drop-shadow(0 0 12px rgba(61, 255, 155, 0.32));
}

.product-cover-preview__dialog {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.9);
  touch-action: none;
}

.product-cover-preview__full {
  display: block;
  max-width: min(96vw, 1440px);
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.product-cover-preview__close {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
}

.product-cover-preview__close:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
</style>
