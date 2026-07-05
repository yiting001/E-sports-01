<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

/**
 * ECharts 通用包装组件。
 * 只负责实例生命周期与自适应尺寸，图表配置由调用方通过 option 传入，
 * option 变化时增量更新（notMerge 重绘，保证切换时间范围后旧序列不残留）。
 */
const props = defineProps<{
  option: echarts.EChartsOption;
  height?: string;
}>();

const container = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!container.value) {
    return;
  }
  chart = echarts.init(container.value);
  chart.setOption(props.option);
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(container.value);
});

watch(
  () => props.option,
  (option) => chart?.setOption(option, { notMerge: true }),
  { deep: true },
);

onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div
    ref="container"
    class="echart-container"
    :style="{ height: height ?? '280px' }"
  />
</template>

<style scoped>
.echart-container {
  width: 100%;
}
</style>
