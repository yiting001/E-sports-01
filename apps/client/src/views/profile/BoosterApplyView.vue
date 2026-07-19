<script setup lang="ts">
/**
 * 打手入驻页：按申请状态展示申请表单、审核进度或只读资料。
 * 公告图由后台配置下发；驳回后保留原资料供修改重提，实名前置规则保持不变。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { BoosterStatus, type BoosterMineView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import BoosterAnnouncementCard from '@/components/profile/BoosterAnnouncementCard.vue';
import BoosterApplicationForm from '@/components/profile/BoosterApplicationForm.vue';
import {
  createBoosterApplicationForm,
  toBoosterSubmitPayload,
  type BoosterApplicationFormModel,
} from '@/components/profile/booster-application-form';
import { boosterApi } from '@/api/booster.api';
import { useToast } from '@/composables/use-toast';
import './BoosterApplyView.responsive.css';

const router = useRouter();
const toast = useToast();

const mine = ref<BoosterMineView | null>(null);
const form = ref<BoosterApplicationFormModel>(createBoosterApplicationForm());
const loading = ref(true);
const loadError = ref(false);
const submitting = ref(false);
const materialUploading = ref(false);

const status = computed(() => mine.value?.status ?? BoosterStatus.None);
const showForm = computed(
  () => status.value === BoosterStatus.None || status.value === BoosterStatus.Rejected,
);
const showReadonly = computed(
  () => status.value === BoosterStatus.Pending || status.value === BoosterStatus.Approved,
);
const realnameBlocked = computed(
  () => (mine.value?.requireRealname ?? false) && !(mine.value?.realnameApproved ?? false),
);
const readonlyForm = computed(() => createBoosterApplicationForm(mine.value?.record));
const canSubmit = computed(
  () =>
    !realnameBlocked.value &&
    !materialUploading.value &&
    toBoosterSubmitPayload(form.value) !== null,
);

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    const result = await boosterApi.mine();
    mine.value = result;
    form.value = createBoosterApplicationForm(result.record);
  } catch {
    mine.value = null;
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  const payload = toBoosterSubmitPayload(form.value);
  if (!payload || !canSubmit.value || submitting.value) {
    return;
  }

  submitting.value = true;
  try {
    await boosterApi.apply(payload);
    toast.show('申请已提交，请等待审核');
    await load();
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="booster-page client-page">
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
        <span class="name">打手入驻</span>
      </div>
    </header>

    <main class="scroll">
      <section
        v-if="loading"
        class="load-state"
      >
        <p>加载中…</p>
      </section>

      <section
        v-else-if="loadError"
        class="load-state card"
      >
        <h2>入驻信息加载失败</h2>
        <p>请检查网络后重新加载。</p>
        <button
          type="button"
          class="retry"
          @click="load"
        >
          重新加载
        </button>
      </section>

      <template v-else-if="mine">
        <aside class="side">
          <BoosterAnnouncementCard
            v-if="showForm"
            :image="mine.onboardingNoticeImage"
          />

          <section
            v-if="status === BoosterStatus.Pending"
            class="state card"
          >
            <h2 class="state-title state-title--pending">
              审核中
            </h2>
            <p class="state-tip">
              入驻申请已提交，请耐心等待管理员审核。
            </p>
          </section>

          <section
            v-else-if="status === BoosterStatus.Approved"
            class="state card"
          >
            <h2 class="state-title state-title--ok">
              已入驻
            </h2>
            <p class="state-tip">
              恭喜，你已成为平台打手，可开始接单服务。
            </p>
          </section>

          <section
            v-else-if="status === BoosterStatus.Rejected"
            class="state card"
          >
            <h2 class="state-title state-title--reject">
              申请被驳回
            </h2>
            <p class="state-tip">
              驳回理由：{{ mine.record?.rejectReason || '未填写' }}，请修改资料后重新提交。
            </p>
          </section>

          <section
            v-if="showForm && realnameBlocked"
            class="state card"
          >
            <h2 class="state-title state-title--reject">
              需先完成实名认证
            </h2>
            <p class="state-tip">
              平台要求打手实名入驻，请先完成认证后再提交申请。
            </p>
            <button
              type="button"
              class="goto-realname"
              @click="router.push({ name: 'realname' })"
            >
              去实名认证
            </button>
          </section>
        </aside>

        <BoosterApplicationForm
          v-if="showForm"
          v-model="form"
          class="application-form"
          :disabled="submitting"
          @uploading-change="materialUploading = $event"
        />

        <BoosterApplicationForm
          v-else-if="showReadonly && mine.record"
          class="application-form"
          :model-value="readonlyForm"
          readonly
        />
      </template>
    </main>

    <footer
      v-if="mine && showForm && !loading && !loadError"
      class="footer"
    >
      <div class="footer-inner">
        <button
          type="button"
          class="submit"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          {{ submitting ? '提交中…' : status === BoosterStatus.Rejected ? '重新提交' : '提交' }}
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.booster-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 14px 14px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 16px;
}

.state-title {
  font-size: 16px;
  font-weight: 800;
}

.state-title--pending {
  color: var(--c-accent);
}

.state-title--ok {
  color: var(--c-neon);
}

.state-title--reject {
  color: var(--c-danger);
}

.state-tip {
  font-size: 13px;
  line-height: 1.65;
  color: var(--c-text-secondary);
}

.goto-realname,
.retry {
  align-self: flex-start;
  min-height: 36px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.load-state {
  width: 100%;
  padding: 28px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  color: var(--c-text-secondary);
}

.load-state h2 {
  font-size: 16px;
  color: var(--c-text);
}

.load-state p {
  font-size: 13px;
  line-height: 1.6;
}

.retry {
  align-self: center;
}

.footer {
  position: relative;
  z-index: 5;
  flex-shrink: 0;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--c-border);
  background: var(--c-surface);
}

.footer-inner {
  width: 100%;
  max-width: 612px;
  margin: 0 auto;
}

.submit {
  width: 100%;
  min-height: 44px;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.submit:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
