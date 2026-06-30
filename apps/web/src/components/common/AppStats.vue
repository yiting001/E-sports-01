<script setup lang="ts">
interface AppStatItem {
  label: string;
  value: string | number;
  helper?: string;
}

defineProps<{
  items: AppStatItem[];
}>();
</script>

<template>
  <section
    class="app-stats"
    aria-label="数据概览"
  >
    <article
      v-for="item in items"
      :key="item.label"
      class="app-stat"
    >
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <small v-if="item.helper">{{ item.helper }}</small>
    </article>
  </section>
</template>

<style scoped>
.app-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.app-stat {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--app-border-color);
  border-radius: 4px;
  background: var(--app-surface-color);
}

.app-stat span,
.app-stat small {
  display: block;
  color: var(--app-text-secondary);
}

.app-stat span {
  font-size: 13px;
}

.app-stat strong {
  display: block;
  margin-top: 8px;
  overflow: hidden;
  color: var(--app-text-color);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-stat small {
  margin-top: 8px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .app-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .app-stats {
    grid-template-columns: 1fr;
  }
}
</style>
