<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { AxiosError } from 'axios';
import {
  BOOSTER_SERVICE_REGIONS,
  BizCode,
  type BoosterPublicView,
} from '@app/contracts';
import { useRoute, useRouter } from 'vue-router';
import { boosterDirectoryApi } from '@/api/booster-directory.api';
import BoosterOnlineBadge from '@/components/booster/BoosterOnlineBadge.vue';
import BoosterVoiceButton from '@/components/booster/BoosterVoiceButton.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { BOOSTER_GENDER_TEXT } from '@/config/booster-directory';
import { useBoosterVoice } from '@/composables/use-booster-voice';
import { useCheckoutDraftStore } from '@/stores/checkout-draft.store';
import {
  safeBoosterReturnTo,
} from '@/utils/booster-route';
import { resolveMediaUrl } from '@/utils/media-url';

const route = useRoute();
const router = useRouter();
const checkout = useCheckoutDraftStore();
const voice = useBoosterVoice();

const booster = ref<BoosterPublicView | null>(null);
const loading = ref(true);
const loadError = ref(false);
const missing = ref(false);
const avatarFailed = ref(false);

const userId = computed(() => String(route.params.userId));
const returnTo = computed(() => safeBoosterReturnTo(route.query.returnTo));
const avatarUrl = computed(() => resolveMediaUrl(booster.value?.avatar ?? ''));
const displayName = computed(() => booster.value?.displayName || booster.value?.userId || '');
const regionLabels = computed(() =>
  BOOSTER_SERVICE_REGIONS.filter((region) =>
    booster.value?.serviceRegions.includes(region.value),
  ).map((region) => region.label),
);

async function loadProfile(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  missing.value = false;
  avatarFailed.value = false;
  try {
    booster.value = await boosterDirectoryApi.detail(userId.value);
  } catch (error) {
    booster.value = null;
    if (error instanceof AxiosError && error.response?.status === BizCode.NotFound) {
      missing.value = true;
    } else {
      loadError.value = true;
    }
  } finally {
    loading.value = false;
  }
}

function selectBooster(): void {
  if (!booster.value?.selectable) {
    return;
  }
  checkout.selectBooster(booster.value);
  if (returnTo.value) {
    void router.replace(returnTo.value);
  } else {
    void router.push({ name: 'category' });
  }
}

onMounted(() => {
  void loadProfile();
});

onBeforeUnmount(() => {
  voice.stop();
});
</script>

<template>
  <div class="booster-profile-page client-page">
    <header class="bar">
      <div class="bar-inner">
        <button
          type="button"
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">打手主页</span>
      </div>
    </header>

    <main class="scroll">
      <section
        v-if="loading"
        class="profile-state"
        aria-live="polite"
      >
        <span class="profile-loader" />
        <p>资料加载中</p>
      </section>

      <section
        v-else-if="loadError"
        class="profile-state card"
        role="alert"
      >
        <h2>打手资料加载失败</h2>
        <p>请检查网络后重新加载。</p>
        <button
          type="button"
          @click="loadProfile"
        >
          重新加载
        </button>
      </section>

      <section
        v-else-if="missing || !booster"
        class="profile-state card"
      >
        <AppIcon
          name="user"
          :size="36"
        />
        <h2>该打手主页暂不可用</h2>
        <p>资料可能已下架或账号状态已变更。</p>
      </section>

      <template v-else>
        <section class="profile-hero card">
          <div class="avatar-wrap">
            <img
              v-if="avatarUrl && !avatarFailed"
              :src="avatarUrl"
              :alt="displayName"
              class="profile-avatar"
              @error="avatarFailed = true"
            >
            <span
              v-else
              class="profile-avatar profile-avatar--fallback"
            >
              <AppIcon
                name="user"
                :size="48"
              />
            </span>
            <BoosterVoiceButton :url="booster.voiceUrl" />
          </div>
          <div class="hero-info">
            <div class="hero-name-line">
              <h1>{{ displayName }}</h1>
              <BoosterOnlineBadge :online="booster.online" />
            </div>
            <p class="profile-id">
              打手 ID {{ booster.userId }}
            </p>
            <div class="hero-stats">
              <span><b>{{ booster.levelName || `Lv.${booster.level}` }}</b>当前等级</span>
              <span><b>{{ booster.completedOrders }}</b>完成订单</span>
              <span><b>{{ BOOSTER_GENDER_TEXT[booster.gender] }}</b>性别</span>
            </div>
          </div>
        </section>

        <section class="profile-block card">
          <h2 class="sec-title">
            服务区服
          </h2>
          <div class="service-regions">
            <span
              v-for="region in regionLabels"
              :key="region"
            >{{ region }}</span>
          </div>
        </section>

        <section class="profile-block card">
          <h2 class="sec-title">
            自我介绍
          </h2>
          <p class="profile-intro">
            {{ booster.intro || '这位打手暂未填写介绍' }}
          </p>
        </section>
      </template>
    </main>

    <footer
      v-if="booster"
      class="profile-footer"
    >
      <div>
        <span>{{ booster.online ? '当前在线' : '当前离线' }}</span>
        <strong>{{ displayName }}</strong>
      </div>
      <button
        type="button"
        :disabled="!booster.selectable"
        :title="booster.unavailableReason || undefined"
        @click="selectBooster"
      >
        {{ booster.selectable ? '选择这位打手' : booster.unavailableReason || '当前不可选' }}
      </button>
    </footer>
  </div>
</template>

<style scoped src="./BoosterProfileView.css"></style>
