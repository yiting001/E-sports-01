<script setup lang="ts">
/**
 * 邀请好友页（全屏）：展示我的邀请码（一键复制）、当前奖励说明、邀请规则（后台富文本配置）、
 * 填写好友邀请码绑定（一次性），以及我的邀请记录（好友昵称 + 奖励快照）。
 */
import DOMPurify from 'dompurify';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { INVITE_LIMITS, type MyInviteView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { useToast } from '@/composables/use-toast';
import { inviteApi } from '@/api/invite.api';

const router = useRouter();
const toast = useToast();

const info = ref<MyInviteView | null>(null);
const loading = ref(true);
const bindCode = ref('');
const binding = ref(false);

/** 邀请规则富文本（消毒后渲染，空串不展示） */
const safeRules = computed(() =>
  info.value ? DOMPurify.sanitize(info.value.rulesHtml) : '',
);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    info.value = await inviteApi.mine();
  } finally {
    loading.value = false;
  }
}

async function copyCode(): Promise<void> {
  if (!info.value) {
    return;
  }
  await navigator.clipboard.writeText(info.value.code);
  toast.show('邀请码已复制');
}

async function bind(): Promise<void> {
  const code = bindCode.value.trim().toUpperCase();
  if (code.length !== INVITE_LIMITS.codeLength) {
    toast.show(`请输入 ${INVITE_LIMITS.codeLength} 位邀请码`);
    return;
  }
  binding.value = true;
  try {
    await inviteApi.bind(code);
    toast.show('绑定成功');
    bindCode.value = '';
    await load();
  } finally {
    binding.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="invite client-page">
    <header class="bar">
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
      <div class="bar-title">
        <span class="name">邀请好友</span>
        <span class="tip">邀请好友填码，双方均可得奖励</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <template v-else-if="info">
        <section class="card block code-block">
          <span class="block-label">我的邀请码</span>
          <span class="code">{{ info.code }}</span>
          <button
            class="copy"
            @click="copyCode"
          >
            复制邀请码
          </button>
          <p
            v-if="info.inviterRewardText"
            class="reward-tip"
          >
            每邀请 1 位好友可得：{{ info.inviterRewardText }}
          </p>
        </section>

        <section
          v-if="!info.bound"
          class="card block"
        >
          <span class="block-label">填写好友邀请码</span>
          <p
            v-if="info.inviteeRewardText"
            class="reward-tip"
          >
            填码绑定成功可得：{{ info.inviteeRewardText }}
          </p>
          <div class="bind-row">
            <input
              v-model="bindCode"
              class="bind-input"
              :maxlength="INVITE_LIMITS.codeLength"
              :placeholder="`输入 ${INVITE_LIMITS.codeLength} 位邀请码`"
            >
            <button
              class="bind-btn"
              :disabled="binding"
              @click="bind"
            >
              {{ binding ? '绑定中…' : '绑定' }}
            </button>
          </div>
        </section>

        <section
          v-if="safeRules"
          class="card block"
        >
          <span class="block-label">邀请规则</span>
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="rules"
            v-html="safeRules"
          />
          <!-- eslint-enable vue/no-v-html -->
        </section>

        <section class="card block">
          <span class="block-label">邀请记录（{{ info.records.length }}）</span>
          <p
            v-if="!info.records.length"
            class="hint"
          >
            还没有邀请到好友，把邀请码分享给好友吧
          </p>
          <div
            v-for="record in info.records"
            :key="record.id"
            class="record"
          >
            <span class="record-name">{{ record.inviteeName }}</span>
            <span class="record-reward">{{ record.inviterRewardText || '—' }}</span>
            <span class="record-time">{{ formatDate(record.createdAt) }}</span>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.invite {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.bar-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.tip {
  font-size: 12px;
  color: var(--c-accent);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 16px 0;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.block-label {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.code-block {
  align-items: center;
}

.code {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 4px;
  color: var(--c-accent);
}

.copy {
  padding: 8px 24px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1206;
  background: var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.reward-tip {
  font-size: 12px;
  color: var(--c-accent);
}

.bind-row {
  display: flex;
  gap: 10px;
}

.bind-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
}

.bind-btn {
  flex-shrink: 0;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1206;
  background: var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.bind-btn:disabled {
  opacity: 0.6;
}

.rules {
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  overflow-wrap: break-word;
}

.rules :deep(img) {
  max-width: 100%;
}

.record {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--c-border);
}

.record:last-child {
  border-bottom: none;
}

.record-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.record-reward {
  font-size: 12px;
  color: var(--c-accent);
}

.record-time {
  font-size: 12px;
  color: var(--c-text-secondary);
}
</style>
