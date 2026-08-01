<script lang="ts">
export {
  resolveFlameWrapFallback,
  resolveFlameWrapOptions,
  type FlameWrapFallbackConfig,
  type FlameWrapElements,
  type FlameWrapInstance,
  type FlameWrapOptions,
} from "./flame-wrap-options";
</script>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";
import {
  createFlameWrap,
  supportsHtmlInCanvas,
} from "./flame-wrap";
import { resolveFlameWrapFallback } from "./flame-wrap-options";
import type {
  FlameWrapInstance,
  FlameWrapOptions,
} from "./flame-wrap-options";

const props = defineProps<FlameWrapOptions>();

const sourceEl = ref<HTMLCanvasElement | null>(null);
const contentEl = ref<HTMLDivElement | null>(null);
const outputEl = ref<HTMLCanvasElement | null>(null);
const native = ref(false);
const effectReady = ref(false);
const reducedMotion = ref(false);
const filterId = `flame-wrap-heat-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

const fallback = computed(() => resolveFlameWrapFallback(props));
const contentMode = computed(() =>
  native.value
    ? "canvas"
    : effectReady.value && fallback.value.enabled
      ? "svg-filter"
      : "plain",
);
const contentStyle = computed(() =>
  contentMode.value === "svg-filter"
    ? { filter: `url(#${filterId})` }
    : undefined,
);

const outputStyle = computed(() => {
  const reach = Math.round(Math.max(props.height ?? 170, 24) * 1.5) + 40;
  const glow = Math.round(Math.max(props.spread ?? 8, 8) * 3) + 16;
  return {
    top: `-${reach}px`,
    right: `-${glow}px`,
    bottom: `-${glow}px`,
    left: `-${glow}px`,
    width: `calc(100% + ${glow * 2}px)`,
    height: `calc(100% + ${reach + glow}px)`,
  };
});

let instance: FlameWrapInstance | null = null;
let disposed = false;
let motionQuery: MediaQueryList | null = null;

function onMotionChange(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches;
}

async function mountEffect(): Promise<void> {
  if (disposed || !sourceEl.value || !contentEl.value || !outputEl.value) {
    return;
  }
  instance = createFlameWrap(
    {
      source: sourceEl.value,
      content: contentEl.value,
      output: outputEl.value,
    },
    props,
  );
  effectReady.value = instance !== null;
}

onMounted(async () => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = motionQuery.matches;
  motionQuery.addEventListener("change", onMotionChange);
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
  motionQuery?.removeEventListener("change", onMotionChange);
  motionQuery = null;
  instance?.destroy();
  instance = null;
  effectReady.value = false;
});

watch(
  () => ({ ...props }),
  (next) => instance?.setOptions(next),
  { deep: true },
);
</script>

<template>
  <div
    class="flame-wrap"
    :data-flame-content-mode="contentMode"
  >
    <svg
      v-if="contentMode === 'svg-filter'"
      class="flame-filter-defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          :id="filterId"
          x="-8%"
          y="-8%"
          width="116%"
          height="116%"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            :baseFrequency="fallback.baseFrequency"
            numOctaves="2"
            seed="7"
            result="noise"
          >
            <animate
              v-if="!reducedMotion"
              attributeName="baseFrequency"
              :values="fallback.frequencyValues"
              :dur="`${fallback.durationSeconds}s`"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feMorphology
            in="SourceAlpha"
            operator="erode"
            :radius="fallback.edgeReach"
            result="inner-mask"
          />
          <feComposite
            in="SourceAlpha"
            in2="inner-mask"
            operator="out"
            result="edge-mask"
          />
          <feComposite
            in="noise"
            in2="edge-mask"
            operator="in"
            result="edge-noise"
          />
          <feFlood
            flood-color="#808080"
            result="neutral"
          />
          <feComposite
            in="neutral"
            in2="edge-mask"
            operator="out"
            result="neutral-center"
          />
          <feMerge result="displacement-map">
            <feMergeNode in="neutral-center" />
            <feMergeNode in="edge-noise" />
          </feMerge>
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacement-map"
            :scale="fallback.displacement"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
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
        class="flame-content"
      >
        <slot />
      </div>
    </canvas>
    <div
      v-if="!native"
      ref="contentEl"
      class="flame-content"
      :style="contentStyle"
    >
      <slot />
    </div>
    <canvas
      ref="outputEl"
      class="flame-output"
      aria-hidden="true"
      :style="outputStyle"
    />
  </div>
</template>

<style scoped>
.flame-wrap {
  position: relative;
  width: 100%;
  isolation: isolate;
}

.flame-filter-defs {
  position: absolute;
  overflow: hidden;
}

.flame-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.flame-output {
  position: absolute;
  z-index: 2;
  pointer-events: none;
}
</style>
