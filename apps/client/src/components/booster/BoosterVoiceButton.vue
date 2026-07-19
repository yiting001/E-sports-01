<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { useBoosterVoice } from '@/composables/use-booster-voice';
import { resolveMediaUrl } from '@/utils/media-url';

const props = defineProps<{ url: string }>();
const voice = useBoosterVoice();

const resolvedUrl = computed(() => resolveMediaUrl(props.url));
const active = computed(() => voice.activeUrl.value === resolvedUrl.value);
const playing = computed(() => active.value && voice.playing.value);
const loading = computed(() => active.value && voice.loading.value);
const failed = computed(() => Boolean(resolvedUrl.value) && voice.failedUrl.value === resolvedUrl.value);

function toggle(): void {
  void voice.toggle(props.url);
}
</script>

<template>
  <button
    type="button"
    class="voice-button"
    :class="{ 'voice-button--active': playing, 'voice-button--error': failed }"
    :disabled="!url"
    :aria-label="!url ? '暂无打手语音' : playing ? '暂停打手语音' : '播放打手语音'"
    @click.stop="toggle"
  >
    <AppIcon
      :name="playing ? 'pause' : 'volume'"
      :size="14"
    />
    <span>{{ failed ? '播放失败' : loading ? '加载中' : playing ? '暂停' : url ? '试听语音' : '暂无语音' }}</span>
  </button>
</template>

<style scoped>
.voice-button {
  width: 100%;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 7px;
  font-size: 11px;
  color: var(--c-neon);
  border: 1px solid rgba(61, 255, 155, 0.28);
  border-radius: var(--radius-sm);
  background: rgba(61, 255, 155, 0.07);
  white-space: nowrap;
}

.voice-button--active {
  color: var(--c-bg);
  background: var(--c-neon);
}

.voice-button--error {
  color: var(--c-danger);
  border-color: rgba(255, 84, 73, 0.35);
  background: rgba(255, 84, 73, 0.08);
}

.voice-button:disabled {
  color: var(--c-text-muted);
  border-color: var(--c-border);
  background: transparent;
  cursor: default;
}
</style>
