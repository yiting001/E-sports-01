<script setup lang="ts">
/** 首页运营横幅：后台多图配置、自动轮播、拖动切换及活动跳转。 */
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import { useRouter } from 'vue-router';
import { PORTAL_BANNER_LIMITS, type PortalBannerItem } from '@app/contracts';
import { noticeApi } from '@/api/notice.api';
import { resolveMediaUrl } from '@/utils/media-url';

interface ResolvedBannerItem extends PortalBannerItem {
  key: string;
}

const DRAG_START_THRESHOLD_PX = 8;
const DRAG_CHANGE_MIN_PX = 40;
const DRAG_CHANGE_RATIO = 0.15;
const DRAG_CLICK_SUPPRESS_MS = 450;

const router = useRouter();
const items = ref<ResolvedBannerItem[]>([]);
const failedKeys = ref<Set<string>>(new Set());
const activeIndex = ref(0);
const intervalSeconds = ref<number>(PORTAL_BANNER_LIMITS.defaultIntervalSeconds);
const dragOffset = ref(0);
const dragging = ref(false);
const hovered = ref(false);
const focused = ref(false);
const pageHidden = ref(false);
const reducedMotion = ref(false);

let timer: number | null = null;
let pointerId: number | null = null;
let pointerStartX = 0;
let pointerStartY = 0;
let horizontalDrag = false;
let pointerMoved = false;
let lastDragAt = 0;
let reducedMotionQuery: MediaQueryList | null = null;

const visibleItems = computed(() => items.value.filter((item) => !failedKeys.value.has(item.key)));
const shouldAutoPlay = computed(
  () =>
    visibleItems.value.length > 1 &&
    !dragging.value &&
    !hovered.value &&
    !focused.value &&
    !pageHidden.value &&
    !reducedMotion.value,
);
const trackStyle = computed<CSSProperties>(() => ({
  transform: `translate3d(calc(-${activeIndex.value * 100}% + ${dragOffset.value}px), 0, 0)`,
}));

function stopAutoPlay(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

function restartAutoPlay(): void {
  stopAutoPlay();
  if (!shouldAutoPlay.value) {
    return;
  }
  timer = window.setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % visibleItems.value.length;
  }, intervalSeconds.value * 1000);
}

function selectSlide(index: number): void {
  activeIndex.value = index;
  restartAutoPlay();
}

function markImageFailed(key: string): void {
  const activeKey = visibleItems.value[activeIndex.value]?.key;
  failedKeys.value = new Set([...failedKeys.value, key]);
  if (activeKey && activeKey !== key) {
    const nextIndex = visibleItems.value.findIndex((item) => item.key === activeKey);
    activeIndex.value = Math.max(0, nextIndex);
  }
}

function openActivity(item: ResolvedBannerItem): void {
  if (!item.activityId || Date.now() - lastDragAt < DRAG_CLICK_SUPPRESS_MS) {
    return;
  }
  void router.push({
    name: 'activity-detail',
    params: { id: item.activityId },
  });
}

function onPointerDown(event: PointerEvent): void {
  if (visibleItems.value.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }
  pointerId = event.pointerId;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  horizontalDrag = false;
  pointerMoved = false;
  dragOffset.value = 0;
  dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (pointerId !== event.pointerId) {
    return;
  }
  const offsetX = event.clientX - pointerStartX;
  const offsetY = event.clientY - pointerStartY;
  if (!horizontalDrag) {
    if (
      Math.abs(offsetX) < DRAG_START_THRESHOLD_PX &&
      Math.abs(offsetY) < DRAG_START_THRESHOLD_PX
    ) {
      return;
    }
    pointerMoved = true;
    if (Math.abs(offsetY) > Math.abs(offsetX)) {
      finishPointer(event, true);
      return;
    }
    horizontalDrag = true;
  }
  event.preventDefault();
  const width = (event.currentTarget as HTMLElement).clientWidth;
  dragOffset.value = Math.max(-width, Math.min(width, offsetX));
}

function onPointerUp(event: PointerEvent): void {
  finishPointer(event, false);
}

function finishPointer(event: PointerEvent, cancelled: boolean): void {
  if (pointerId !== event.pointerId) {
    return;
  }
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }
  if (horizontalDrag) {
    const offsetX = event.clientX - pointerStartX;
    const threshold = Math.max(DRAG_CHANGE_MIN_PX, target.clientWidth * DRAG_CHANGE_RATIO);
    const itemCount = visibleItems.value.length;
    if (!cancelled && itemCount > 0 && Math.abs(offsetX) >= threshold) {
      const direction = offsetX < 0 ? 1 : -1;
      activeIndex.value = (activeIndex.value + direction + itemCount) % itemCount;
    }
  }
  if (horizontalDrag || pointerMoved || cancelled) {
    lastDragAt = Date.now();
  }
  pointerId = null;
  horizontalDrag = false;
  pointerMoved = false;
  dragOffset.value = 0;
  dragging.value = false;
}

function onFocusOut(event: FocusEvent): void {
  const container = event.currentTarget as HTMLElement;
  if (!(event.relatedTarget instanceof Node) || !container.contains(event.relatedTarget)) {
    focused.value = false;
  }
}

function onVisibilityChange(): void {
  pageHidden.value = document.visibilityState === 'hidden';
}

function onReducedMotionChange(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches;
}

async function load(): Promise<void> {
  try {
    const banner = await noticeApi.getBanner();
    items.value = banner.items
      .map((item, index) => ({
        ...item,
        image: resolveMediaUrl(item.image),
        key: `${index}-${item.image}-${item.activityId}`,
      }))
      .filter((item) => Boolean(item.image));
    intervalSeconds.value = banner.intervalSeconds;
  } catch {
    // 横幅读取失败时静默隐藏，不阻断首页商品和导航。
  }
}

watch(
  () => visibleItems.value.length,
  (length) => {
    if (activeIndex.value >= length) {
      activeIndex.value = 0;
    }
  },
);
watch([shouldAutoPlay, intervalSeconds], restartAutoPlay, { immediate: true });

onMounted(() => {
  pageHidden.value = document.visibilityState === 'hidden';
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.value = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener('change', onReducedMotionChange);
  void load();
});

onBeforeUnmount(() => {
  stopAutoPlay();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  reducedMotionQuery?.removeEventListener('change', onReducedMotionChange);
});
</script>

<template>
  <section
    v-if="visibleItems.length"
    class="banner card"
    aria-label="首页活动横幅"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="focused = true"
    @focusout="onFocusOut"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="finishPointer($event, true)"
  >
    <div
      class="banner__track"
      :class="{ 'banner__track--dragging': dragging }"
      :style="trackStyle"
    >
      <div
        v-for="(item, index) in visibleItems"
        :key="item.key"
        class="banner__slide"
        :class="{ 'banner__slide--linked': item.activityId && index === activeIndex }"
        :role="item.activityId && index === activeIndex ? 'link' : undefined"
        :tabindex="item.activityId && index === activeIndex ? 0 : -1"
        :aria-hidden="index === activeIndex ? undefined : 'true'"
        @click="openActivity(item)"
        @keydown.enter="openActivity(item)"
        @keydown.space.prevent="openActivity(item)"
      >
        <img
          :src="item.image"
          alt="运营活动"
          draggable="false"
          @error="markImageFailed(item.key)"
        >
      </div>
    </div>

    <div
      v-if="visibleItems.length > 1"
      class="banner__dots"
      aria-label="选择横幅"
    >
      <button
        v-for="(_item, index) in visibleItems"
        :key="index"
        type="button"
        class="banner__dot"
        :class="{ 'banner__dot--active': activeIndex === index }"
        :aria-label="`第 ${index + 1} 张横幅`"
        :aria-current="activeIndex === index ? 'true' : undefined"
        @pointerdown.stop
        @click.stop="selectSlide(index)"
      />
    </div>
  </section>
</template>

<style scoped>
.banner {
  position: relative;
  width: 100%;
  /* 移动端按 21:9 收敛，桌面延续最高 160px 的短横幅。 */
  height: min(160px, calc((100vw - 24px) * 0.428571));
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
}

.banner__track {
  width: 100%;
  height: 100%;
  display: flex;
  transition: transform 0.38s ease;
  will-change: transform;
}

.banner__track--dragging {
  transition: none;
}

.banner__slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.banner__slide--linked {
  cursor: pointer;
}

.banner__slide img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  pointer-events: none;
}

.banner__dots {
  position: absolute;
  right: 0;
  bottom: 10px;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
}

.banner__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: rgba(11, 14, 20, 0.55);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.banner__dot--active {
  border-color: var(--c-accent);
  background: var(--c-accent);
}

@media (prefers-reduced-motion: reduce) {
  .banner__track {
    transition: none;
  }
}
</style>
