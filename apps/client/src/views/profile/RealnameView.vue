<script setup lang="ts">
/**
 * 实名认证页（全屏，入口在「我的」页更多功能 / 打手等级卡 / 打手入驻页引导）。
 * 按认证状态分场景：未提交/被驳回展示表单；审核中展示进度；已通过展示脱敏记录。
 * 提交姓名 + 身份证号 + 证件正反面照片，由管理端审核。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  CHINA_ID_CARD_PATTERN,
  RealnameStatus,
  type RealnameMineView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import IdCardUploadCard from '@/components/profile/IdCardUploadCard.vue';
import { realnameApi } from '@/api/realname.api';
import { useToast } from '@/composables/use-toast';

const router = useRouter();
const toast = useToast();

const mine = ref<RealnameMineView | null>(null);
const loading = ref(true);
const submitting = ref(false);

const realName = ref('');
const idCardNo = ref('');
const frontImage = ref('');
const backImage = ref('');

const status = computed(() => mine.value?.status ?? RealnameStatus.None);
const record = computed(() => mine.value?.record ?? null);
const required = computed(() => mine.value?.required ?? false);
/** 未提交或被驳回时展示表单 */
const showForm = computed(
  () => status.value === RealnameStatus.None || status.value === RealnameStatus.Rejected,
);
const canSubmit = computed(
  () =>
    realName.value.trim() !== '' &&
    CHINA_ID_CARD_PATTERN.test(idCardNo.value.trim()) &&
    frontImage.value !== '' &&
    backImage.value !== '',
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    mine.value = await realnameApi.mine();
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) {
    return;
  }
  submitting.value = true;
  try {
    await realnameApi.submit({
      realName: realName.value.trim(),
      idCardNo: idCardNo.value.trim(),
      frontImage: frontImage.value,
      backImage: backImage.value,
    });
    toast.show('已提交，等待审核');
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
  <div class="realname-page client-page">
    <header class="bar">
      <div class="bar-inner">
        <button
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">实名认证</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>

      <template v-else>
        <section
          v-if="status === RealnameStatus.Pending"
          class="card state"
        >
          <h3 class="state-title state-title--pending">
            审核中
          </h3>
          <p class="state-tip">
            认证信息已提交，请耐心等待管理员审核。
          </p>
        </section>

        <section
          v-else-if="status === RealnameStatus.Approved"
          class="card state"
        >
          <h3 class="state-title state-title--ok">
            已通过
          </h3>
          <p class="state-tip">
            实名认证已通过，可正常使用平台全部功能。
          </p>
        </section>

        <section
          v-else-if="status === RealnameStatus.Rejected"
          class="card state state--reject"
        >
          <h3 class="state-title state-title--reject">
            认证被驳回
          </h3>
          <p class="state-tip">
            驳回理由：{{ record?.rejectReason || '未填写' }}，请核对信息后重新提交。
          </p>
        </section>

        <section
          v-else-if="required"
          class="card state"
        >
          <h3 class="state-title state-title--pending">
            需完成实名认证
          </h3>
          <p class="state-tip">
            平台要求当前身份完成实名认证，请提交证件信息等待审核。
          </p>
        </section>

        <section
          v-if="record && !showForm"
          class="card form form--readonly"
        >
          <div class="row">
            <span class="label">真实姓名</span>
            <span class="value">{{ record.realName }}</span>
          </div>
          <div class="row">
            <span class="label">身份证号</span>
            <span class="value">{{ record.idCardMasked }}</span>
          </div>
        </section>

        <template v-if="showForm">
          <section class="card form form--editable">
            <div class="row">
              <span class="label">真实姓名</span>
              <input
                v-model="realName"
                class="input"
                maxlength="64"
                placeholder="请输入与身份证一致的姓名"
              >
            </div>
            <div class="row">
              <span class="label">身份证号</span>
              <input
                v-model="idCardNo"
                class="input"
                maxlength="18"
                placeholder="请输入 18 位身份证号"
              >
            </div>
          </section>

          <section class="card uploads">
            <IdCardUploadCard
              v-model="frontImage"
              label="身份证人像面"
              hint="姓名、头像、身份证号需清晰可见"
            />
            <IdCardUploadCard
              v-model="backImage"
              label="身份证国徽面"
              hint="签发机关和有效期限需清晰可见"
            />
          </section>

          <p class="tip">
            请上传清晰、完整的身份证正反面照片，提交后等待管理员审核。
          </p>

          <button
            class="submit"
            :disabled="!canSubmit || submitting"
            @click="submit"
          >
            {{ submitting ? '提交中…' : status === RealnameStatus.Rejected ? '重新提交' : '提交认证' }}
          </button>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.realname-page {
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
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-muted);
  padding: 24px 0;
}

.state {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.state-title--pending {
  color: var(--c-accent);
}

.state-title--ok {
  color: var(--c-success, #4caf50);
}

.state-title--reject {
  color: var(--c-danger);
}

.state-tip {
  font-size: 13px;
  color: var(--c-text-secondary);
  line-height: 1.6;
}

.form {
  padding: 4px 14px;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--c-border);
}

.row:last-child {
  border-bottom: none;
}

.label {
  flex-shrink: 0;
  width: 64px;
  font-size: 14px;
  color: var(--c-text-secondary);
}

.value {
  flex: 1;
  font-size: 14px;
  color: var(--c-text);
  word-break: break-word;
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--c-text);
  font-size: 14px;
}

.uploads {
  padding: 16px 14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 480px) {
  .uploads {
    grid-template-columns: repeat(2, 1fr);
  }
}

.tip {
  font-size: 12px;
  color: var(--c-text-muted);
  line-height: 1.6;
}

.submit {
  padding: 12px;
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.submit:disabled {
  opacity: 0.5;
}
</style>
