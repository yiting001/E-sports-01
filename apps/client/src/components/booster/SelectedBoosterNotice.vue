<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BoosterServiceRegion } from '@app/contracts';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';
import BoosterOnlineBadge from './BoosterOnlineBadge.vue';
import { useCheckoutDraftStore } from '@/stores/checkout-draft.store';
import { resolveMediaUrl } from '@/utils/media-url';

const props = defineProps<{ serviceRegion?: BoosterServiceRegion }>();
const route = useRoute();
const router = useRouter();
const checkout = useCheckoutDraftStore();
const avatarFailed = ref(false);

const booster = computed(() => checkout.specifiedBooster);
const avatarUrl = computed(() => resolveMediaUrl(booster.value?.avatar ?? ''));

watch(avatarUrl, () => {
  avatarFailed.value = false;
});

function changeBooster(): void {
  void router.push({
    name: 'booster-list',
    query: {
      returnTo: route.fullPath,
      serviceRegion: props.serviceRegion,
    },
  });
}

function openProfile(): void {
  if (!booster.value) {
    return;
  }
  void router.push({
    name: 'booster-profile',
    params: { userId: booster.value.userId },
    query: { returnTo: route.fullPath, serviceRegion: props.serviceRegion },
  });
}
</script>

<template>
  <aside
    v-if="booster"
    class="selected-booster"
  >
    <button
      type="button"
      class="selected-profile"
      @click="openProfile"
    >
      <span class="selected-avatar">
        <img
          v-if="avatarUrl && !avatarFailed"
          :src="avatarUrl"
          :alt="booster.displayName"
          @error="avatarFailed = true"
        >
        <AppIcon
          v-else
          name="user"
          :size="20"
        />
      </span>
      <span class="selected-copy">
        <span class="selected-label">已选打手</span>
        <strong>{{ booster.displayName || booster.userId }}</strong>
      </span>
      <BoosterOnlineBadge :online="booster.online" />
    </button>
    <button
      type="button"
      class="change-button"
      @click="changeBooster"
    >
      更换
    </button>
  </aside>
</template>

<style scoped>
.selected-booster {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(61, 255, 155, 0.24);
  border-left: 3px solid var(--c-neon);
  background: rgba(61, 255, 155, 0.06);
}

.selected-profile {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
}

.selected-avatar {
  width: 38px;
  height: 38px;
  flex: none;
  display: grid;
  place-items: center;
  color: var(--c-text-muted);
  border-radius: var(--radius-sm);
  background: var(--c-surface-2);
  overflow: hidden;
}

.selected-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.selected-label {
  font-size: 10px;
  color: var(--c-text-muted);
}

.change-button {
  flex: none;
  min-height: 34px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--c-accent);
  border: 1px solid var(--c-accent);
  border-radius: var(--radius-sm);
}

@media (max-width: 420px) {
  .selected-booster :deep(.online-badge) {
    display: none;
  }
}
</style>
