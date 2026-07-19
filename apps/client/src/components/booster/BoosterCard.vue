<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  BOOSTER_SERVICE_REGIONS,
  type BoosterPublicView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import BoosterOnlineBadge from './BoosterOnlineBadge.vue';
import BoosterVoiceButton from './BoosterVoiceButton.vue';
import { BOOSTER_GENDER_TEXT } from '@/config/booster-directory';
import { resolveMediaUrl } from '@/utils/media-url';

const props = defineProps<{ booster: BoosterPublicView }>();
const emit = defineEmits<{
  open: [booster: BoosterPublicView];
  select: [booster: BoosterPublicView];
}>();

const avatarFailed = ref(false);
const avatarUrl = computed(() => resolveMediaUrl(props.booster.avatar));
const displayName = computed(() => props.booster.displayName || props.booster.userId);
const genderText = computed(() => BOOSTER_GENDER_TEXT[props.booster.gender]);
const regionLabels = computed(() =>
  BOOSTER_SERVICE_REGIONS
    .filter((region) => props.booster.serviceRegions.includes(region.value))
    .map((region) => region.label.replace('三角洲 - ', '')),
);

watch(avatarUrl, () => {
  avatarFailed.value = false;
});
</script>

<template>
  <article class="booster-card card">
    <div class="booster-media">
      <button
        type="button"
        class="avatar-button"
        :aria-label="`查看${displayName}的主页`"
        @click="emit('open', booster)"
      >
        <img
          v-if="avatarUrl && !avatarFailed"
          :src="avatarUrl"
          :alt="displayName"
          class="avatar"
          @error="avatarFailed = true"
        >
        <span
          v-else
          class="avatar avatar--fallback"
        >
          <AppIcon
            name="user"
            :size="30"
          />
        </span>
      </button>
      <BoosterVoiceButton :url="booster.voiceUrl" />
    </div>

    <button
      type="button"
      class="booster-info"
      @click="emit('open', booster)"
    >
      <span class="name-line">
        <strong class="display-name">{{ displayName }}</strong>
        <span class="gender">{{ genderText }}</span>
        <BoosterOnlineBadge :online="booster.online" />
      </span>
      <span class="uid">ID {{ booster.userId }}</span>
      <span class="level-line">
        <span>{{ booster.levelName || `Lv.${booster.level}` }}</span>
        <span>{{ booster.completedOrders }} 单</span>
      </span>
      <span class="regions">
        <span
          v-for="region in regionLabels"
          :key="region"
          class="region"
        >{{ region }}</span>
      </span>
      <span class="intro">{{ booster.intro || '这位打手暂未填写介绍' }}</span>
    </button>

    <button
      type="button"
      class="select-button"
      :disabled="!booster.selectable"
      :title="booster.unavailableReason || undefined"
      @click="emit('select', booster)"
    >
      {{ booster.selectable ? '选择打手' : booster.unavailableReason || '当前不可选' }}
    </button>
  </article>
</template>

<style scoped>
.booster-card {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr) 104px;
  align-items: center;
  gap: 14px;
  min-height: 150px;
  padding: 14px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.booster-card:hover {
  border-color: rgba(61, 255, 155, 0.38);
  transform: translateY(-1px);
}

.booster-media {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.avatar-button,
.avatar {
  width: 94px;
  height: 94px;
}

.avatar {
  display: block;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-border);
  background: var(--c-surface-2);
}

.avatar--fallback {
  display: grid;
  place-items: center;
  color: var(--c-text-muted);
}

.booster-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
}

.name-line,
.level-line,
.regions {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
}

.display-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
}

.gender {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--c-accent);
}

.uid {
  max-width: 100%;
  font-family: var(--font-num);
  font-size: 11px;
  color: var(--c-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-line {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.level-line span:first-child {
  color: var(--c-accent);
  font-weight: 700;
}

.regions {
  flex-wrap: wrap;
}

.region {
  padding: 2px 6px;
  font-size: 10px;
  color: var(--c-neon);
  border: 1px solid rgba(61, 255, 155, 0.25);
  border-radius: var(--radius-sm);
}

.intro {
  width: 100%;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-text-secondary);
}

.select-button {
  min-height: 42px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
}

.select-button:disabled {
  color: var(--c-text-muted);
  background: var(--c-surface-2);
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .booster-card {
    grid-template-columns: 78px minmax(0, 1fr);
    gap: 11px;
    min-height: 142px;
    padding: 12px;
  }

  .avatar-button,
  .avatar {
    width: 78px;
    height: 78px;
  }

  .select-button {
    grid-column: 2;
    width: 100%;
    min-height: 38px;
  }

  .display-name {
    font-size: 15px;
  }
}
</style>
