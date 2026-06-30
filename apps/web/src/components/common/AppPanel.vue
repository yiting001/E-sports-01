<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  eyebrow?: string;
}>();
</script>

<template>
  <section class="app-panel">
    <header
      v-if="title || description || eyebrow || $slots.actions"
      class="app-panel__head"
    >
      <div class="app-panel__title">
        <p v-if="eyebrow">
          {{ eyebrow }}
        </p>
        <h2 v-if="title">
          {{ title }}
        </h2>
        <span v-if="description">
          {{ description }}
        </span>
      </div>
      <div
        v-if="$slots.actions"
        class="app-panel__actions"
      >
        <slot name="actions" />
      </div>
    </header>

    <div
      v-if="$slots.toolbar"
      class="app-panel__toolbar"
    >
      <slot name="toolbar" />
    </div>

    <div class="app-panel__body">
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      class="app-panel__footer"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.app-panel {
  min-width: 0;
  border: 1px solid var(--app-border-color);
  border-radius: 4px;
  background: var(--app-surface-color);
}

.app-panel__head,
.app-panel__toolbar,
.app-panel__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.app-panel__head {
  justify-content: space-between;
  border-bottom: 1px solid var(--app-border-color);
}

.app-panel__toolbar {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--app-border-color);
  background: var(--app-muted-bg);
}

.app-panel__body {
  min-width: 0;
  padding: 16px;
}

.app-panel__footer {
  justify-content: flex-end;
  border-top: 1px solid var(--app-border-color);
}

.app-panel__title {
  min-width: 0;
}

.app-panel__title p {
  margin: 0 0 4px;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.app-panel__title h2 {
  margin: 0;
  color: var(--app-text-color);
  font-size: 16px;
  font-weight: 600;
}

.app-panel__title span {
  display: block;
  margin-top: 6px;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.app-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 720px) {
  .app-panel__head,
  .app-panel__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .app-panel__actions,
  .app-panel__footer {
    justify-content: flex-start;
  }
}
</style>
