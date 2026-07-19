<script setup lang="ts">
defineProps<{ online: boolean }>();
</script>

<template>
  <span
    class="online-badge"
    :class="{ 'online-badge--active': online }"
  >
    <span class="online-dot" />
    {{ online ? '在线' : '离线' }}
  </span>
</template>

<style scoped>
.online-badge {
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  font-size: 11px;
  color: var(--c-text-muted);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-text-muted);
}

.online-badge--active {
  color: var(--c-neon);
  border-color: rgba(61, 255, 155, 0.32);
  background: rgba(61, 255, 155, 0.08);
}

.online-badge--active .online-dot {
  background: var(--c-neon);
  box-shadow: 0 0 7px rgba(61, 255, 155, 0.75);
}
</style>
