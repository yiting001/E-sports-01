<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  BOOSTER_LIMITS,
  BoosterGender,
  PAGINATION_DEFAULTS,
  type BoosterPublicView,
} from '@app/contracts';
import { useRoute, useRouter } from 'vue-router';
import { boosterDirectoryApi } from '@/api/booster-directory.api';
import BoosterCard from '@/components/booster/BoosterCard.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import {
  BOOSTER_GENDER_FILTERS,
  BOOSTER_PRESENCE_REFRESH_MS,
} from '@/config/booster-directory';
import { useBoosterVoice } from '@/composables/use-booster-voice';
import { useCheckoutDraftStore } from '@/stores/checkout-draft.store';
import {
  parseBoosterServiceRegion,
  safeBoosterReturnTo,
} from '@/utils/booster-route';

const route = useRoute();
const router = useRouter();
const checkout = useCheckoutDraftStore();
const voice = useBoosterVoice();

const keyword = ref('');
const appliedKeyword = ref('');
const gender = ref<BoosterGender | ''>('');
const boosters = ref<BoosterPublicView[]>([]);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const total = ref(0);
const loading = ref(false);
const loadError = ref(false);
let requestId = 0;
let presenceTimer: number | undefined;

const serviceRegion = computed(() => parseBoosterServiceRegion(route.query.serviceRegion));
const returnTo = computed(() => safeBoosterReturnTo(route.query.returnTo));
const canLoadMore = computed(() => boosters.value.length < total.value);
const emptyText = computed(() =>
  appliedKeyword.value ? `没有找到“${appliedKeyword.value}”` : '暂无可选择的打手',
);

async function load(reset = false): Promise<void> {
  const targetPage = reset ? PAGINATION_DEFAULTS.page : page.value + 1;
  const currentRequest = ++requestId;
  loading.value = true;
  loadError.value = false;
  if (reset) {
    boosters.value = [];
  }
  try {
    const result = await boosterDirectoryApi.list({
      page: targetPage,
      pageSize: PAGINATION_DEFAULTS.pageSize,
      keyword: appliedKeyword.value || undefined,
      gender: gender.value || undefined,
      serviceRegion: serviceRegion.value,
    });
    if (currentRequest !== requestId) {
      return;
    }
    boosters.value = reset ? result.list : [...boosters.value, ...result.list];
    total.value = result.total;
    page.value = targetPage;
  } catch {
    if (currentRequest === requestId) {
      loadError.value = true;
    }
  } finally {
    if (currentRequest === requestId) {
      loading.value = false;
    }
  }
}

async function refreshPresence(): Promise<void> {
  if (loading.value || document.hidden || !boosters.value.length) {
    return;
  }
  const currentRequest = requestId;
  try {
    const result = await boosterDirectoryApi.list({
      page: PAGINATION_DEFAULTS.page,
      pageSize: Math.min(
        Math.max(boosters.value.length, PAGINATION_DEFAULTS.pageSize),
        PAGINATION_DEFAULTS.maxPageSize,
      ),
      keyword: appliedKeyword.value || undefined,
      gender: gender.value || undefined,
      serviceRegion: serviceRegion.value,
    });
    if (currentRequest !== requestId) {
      return;
    }
    const latest = new Map(result.list.map((item) => [item.userId, item]));
    boosters.value = boosters.value.map((item) => latest.get(item.userId) ?? item);
    total.value = result.total;
  } catch {
    // 后台刷新失败时保留上次快照，用户主动刷新仍会展示错误状态。
  }
}

function submitSearch(): void {
  appliedKeyword.value = keyword.value.trim();
  void load(true);
}

function selectGender(value: BoosterGender | ''): void {
  if (gender.value === value) {
    return;
  }
  gender.value = value;
  void load(true);
}

function loadMore(): void {
  if (loading.value || !canLoadMore.value) {
    return;
  }
  void load();
}

function openProfile(booster: BoosterPublicView): void {
  void router.push({
    name: 'booster-profile',
    params: { userId: booster.userId },
    query: {
      returnTo: returnTo.value || undefined,
      serviceRegion: serviceRegion.value,
    },
  });
}

function selectBooster(booster: BoosterPublicView): void {
  if (!booster.selectable) {
    return;
  }
  checkout.selectBooster(booster);
  if (returnTo.value) {
    void router.replace(returnTo.value);
  } else {
    void router.push({ name: 'category' });
  }
}

onMounted(() => {
  void load(true);
  presenceTimer = window.setInterval(() => {
    void refreshPresence();
  }, BOOSTER_PRESENCE_REFRESH_MS);
});

onBeforeUnmount(() => {
  window.clearInterval(presenceTimer);
  voice.stop();
});
</script>

<template>
  <div class="booster-list-page client-page">
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
        <div class="bar-title">
          <span class="name">挑选打手</span>
          <span class="tip">{{ total ? `${total} 位打手` : '在线状态实时更新' }}</span>
        </div>
      </div>
    </header>

    <main class="scroll">
      <section class="directory-tools">
        <form
          class="directory-search"
          role="search"
          @submit.prevent="submitSearch"
        >
          <AppIcon
            name="search"
            :size="17"
          />
          <input
            v-model="keyword"
            type="search"
            :maxlength="BOOSTER_LIMITS.directoryKeywordMax"
            placeholder="搜索打手 ID 或名字"
            autocomplete="off"
          >
          <button type="submit">
            搜索
          </button>
        </form>
        <div
          class="gender-tabs"
          aria-label="性别筛选"
        >
          <button
            v-for="item in BOOSTER_GENDER_FILTERS"
            :key="item.value"
            type="button"
            :class="{ active: gender === item.value }"
            :aria-pressed="gender === item.value"
            @click="selectGender(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <section
        v-if="loading && !boosters.length"
        class="booster-grid"
        aria-live="polite"
      >
        <div
          v-for="index in 4"
          :key="index"
          class="booster-skeleton card"
        >
          <span />
          <div><i /><i /><i /></div>
        </div>
      </section>

      <section
        v-else-if="loadError && !boosters.length"
        class="directory-state card"
        role="alert"
      >
        <h2>打手列表加载失败</h2>
        <p>请检查网络后重新加载。</p>
        <button
          type="button"
          @click="load(true)"
        >
          重新加载
        </button>
      </section>

      <section
        v-else-if="!boosters.length"
        class="directory-state card"
      >
        <AppIcon
          name="user"
          :size="34"
        />
        <p>{{ emptyText }}</p>
        <button
          v-if="appliedKeyword"
          type="button"
          @click="keyword = ''; submitSearch()"
        >
          清除搜索
        </button>
      </section>

      <section
        v-else
        class="booster-grid"
      >
        <BoosterCard
          v-for="booster in boosters"
          :key="booster.userId"
          :booster="booster"
          @open="openProfile"
          @select="selectBooster"
        />
      </section>

      <div
        v-if="boosters.length"
        class="load-more-wrap"
      >
        <p
          v-if="loadError"
          class="more-error"
        >
          加载失败，请重试
        </p>
        <button
          v-if="canLoadMore"
          type="button"
          class="load-more"
          :disabled="loading"
          @click="loadMore"
        >
          {{ loading ? '加载中…' : loadError ? '重新加载' : '加载更多' }}
        </button>
        <span v-else>已显示全部打手</span>
      </div>
    </main>
  </div>
</template>

<style scoped src="./BoosterListView.css"></style>
