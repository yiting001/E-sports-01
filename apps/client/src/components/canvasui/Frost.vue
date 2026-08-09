<script lang="ts">
export {
  resolveFrostOptions,
  type FrostElements,
  type FrostInstance,
  type FrostOptions,
} from "./frost-options";
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { supportsHtmlInCanvas } from "./frost-canvas";
import {
  resolveFrostOptions,
  type FrostInstance,
  type FrostOptions,
} from "./frost-options";
import { createFrost } from "./frost";

const props = defineProps<FrostOptions>();

const sourceEl = ref<HTMLCanvasElement | null>(null);
const contentEl = ref<HTMLDivElement | null>(null);
const outputEl = ref<HTMLCanvasElement | null>(null);
const native = ref(false);

let instance: FrostInstance | null = null;
let disposed = false;

async function mountEffect(): Promise<void> {
  if (disposed || !sourceEl.value || !contentEl.value || !outputEl.value) {
    return;
  }
  instance = createFrost(
    {
      source: sourceEl.value,
      content: contentEl.value,
      output: outputEl.value,
    },
    props
  );
}

onMounted(async () => {
  native.value = supportsHtmlInCanvas();
  await nextTick();
  await mountEffect();
  if (native.value && !instance) {
    native.value = false;
    await nextTick();
    await mountEffect();
  }
});

onBeforeUnmount(() => {
  disposed = true;
  instance?.destroy();
  instance = null;
});

watch(
  () => ({ ...props }),
  (next) => instance?.setOptions(resolveFrostOptions(next)),
  { deep: true }
);
</script>

<template>
  <div style="position: relative; height: 100dvh">
    <canvas
      ref="sourceEl"
      layoutsubtree="true"
      :style="
        native
          ? 'position: absolute; inset: 0; width: 100%; height: 100%'
          : 'display: none'
      "
    >
      <div
        v-if="native"
        ref="contentEl"
        style="position: relative; width: 100%; height: 100%; overflow: auto"
      >
        <slot />
      </div>
    </canvas>
    <div
      v-if="!native"
      ref="contentEl"
      style="position: relative; width: 100%; height: 100%; overflow: auto"
    >
      <slot />
    </div>
    <canvas
      ref="outputEl"
      aria-hidden="true"
      style="
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      "
    />
  </div>
</template>
