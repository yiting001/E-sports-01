<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    data: unknown[];
    loading?: boolean;
    minWidth?: number | string;
    tableClass?: string;
    emptyText?: string;
  }>(),
  {
    loading: false,
    minWidth: 900,
    tableClass: '',
    emptyText: '暂无数据',
  },
);

const scrollBody = ref<HTMLElement>();
const metrics = reactive({
  clientWidth: 0,
  scrollLeft: 0,
  scrollWidth: 0,
});

let resizeObserver: ResizeObserver | undefined;

const tableMinWidth = computed(() =>
  typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth,
);
const maxScrollLeft = computed(() => Math.max(metrics.scrollWidth - metrics.clientWidth, 0));
const canScroll = computed(() => maxScrollLeft.value > 1);
const thumbWidth = computed(() => {
  if (!canScroll.value) {
    return 100;
  }
  return Math.max((metrics.clientWidth / metrics.scrollWidth) * 100, 12);
});
const thumbLeft = computed(() => {
  if (!canScroll.value) {
    return 0;
  }
  return (metrics.scrollLeft / maxScrollLeft.value) * (100 - thumbWidth.value);
});
const thumbStyle = computed(() => ({
  left: `${thumbLeft.value}%`,
  width: `${thumbWidth.value}%`,
}));

function updateMetrics(): void {
  const body = scrollBody.value;
  if (!body) {
    return;
  }
  metrics.clientWidth = body.clientWidth;
  metrics.scrollLeft = body.scrollLeft;
  metrics.scrollWidth = body.scrollWidth;
}

function scrollByStep(direction: -1 | 1): void {
  const body = scrollBody.value;
  if (!body) {
    return;
  }
  body.scrollBy({ left: direction * Math.max(body.clientWidth * 0.72, 240), behavior: 'smooth' });
}

function handleWheel(event: WheelEvent): void {
  const body = scrollBody.value;
  if (!body || !canScroll.value) {
    return;
  }
  const shouldHandleX = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
  if (!shouldHandleX) {
    return;
  }
  event.preventDefault();
  body.scrollLeft += event.deltaX || event.deltaY;
  updateMetrics();
}

function jumpToTrack(event: MouseEvent): void {
  const body = scrollBody.value;
  const target = event.currentTarget;
  if (!body || !(target instanceof HTMLElement) || !canScroll.value) {
    return;
  }
  const rect = target.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  body.scrollLeft = ratio * maxScrollLeft.value;
  updateMetrics();
}

onMounted(() => {
  void nextTick(() => {
    updateMetrics();
    const body = scrollBody.value;
    if (!body) {
      return;
    }
    resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(body);
    const content = body.querySelector('.app-data-table__content');
    if (content instanceof HTMLElement) {
      resizeObserver.observe(content);
    }
  });
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(
  () => props.data,
  () => {
    void nextTick(updateMetrics);
  },
);
</script>

<template>
  <div
    class="app-data-table"
    :style="{ '--app-data-table-min-width': tableMinWidth }"
  >
    <div
      ref="scrollBody"
      class="app-data-table__body"
      @scroll="updateMetrics"
      @wheel="handleWheel"
    >
      <div class="app-data-table__content">
        <el-table
          v-loading="loading"
          :data="data"
          :empty-text="emptyText"
          class="app-data-table__table"
          :class="tableClass"
        >
          <slot />
        </el-table>
      </div>
    </div>
    <div
      v-if="canScroll"
      class="app-data-table__controls"
    >
      <el-button
        circle
        text
        :icon="ArrowLeft"
        :disabled="metrics.scrollLeft <= 0"
        class="app-data-table__scroll-button"
        aria-label="向左滚动表格"
        @click="scrollByStep(-1)"
      />
      <button
        type="button"
        class="app-data-table__track"
        aria-label="表格横向滚动条"
        @click="jumpToTrack"
      >
        <span
          class="app-data-table__thumb"
          :style="thumbStyle"
        />
      </button>
      <el-button
        circle
        text
        :icon="ArrowRight"
        :disabled="metrics.scrollLeft >= maxScrollLeft"
        class="app-data-table__scroll-button is-next"
        aria-label="向右滚动表格"
        @click="scrollByStep(1)"
      />
    </div>
  </div>
</template>

<style scoped>
.app-data-table {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
}

.app-data-table__body {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.app-data-table__body::-webkit-scrollbar {
  display: none;
}

.app-data-table__content {
  display: block;
  width: max(100%, var(--app-data-table-min-width));
  max-width: none;
}

.app-data-table__table {
  width: 100%;
  max-width: none;
}

.app-data-table__table :deep(.el-table__header th) {
  color: #475569;
  font-weight: 800;
  background: #f8fafc;
}

.app-data-table__table :deep(.el-table__cell) {
  padding: 13px 0;
}

.app-data-table__table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.app-data-table__controls {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 8px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

.app-data-table__scroll-button {
  width: 28px;
  height: 28px;
  color: #475569;
}

.app-data-table__track {
  position: relative;
  height: 10px;
  padding: 0;
  cursor: pointer;
  border: 0;
  border-radius: 999px;
  background: #e2e8f0;
}

.app-data-table__thumb {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 44px;
  border-radius: 999px;
  background: #94a3b8;
}
</style>
