<script setup lang="ts">
/**
 * 投诉反馈页（全屏）：选择反馈类型 → 填写被投诉对象与内容提交，
 * 下方展示我的历史反馈及处理进度/回复。首页「投诉客服/打手」入口进入。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FEEDBACK_LIMITS,
  FEEDBACK_TYPE_TEXT,
  FeedbackStatus,
  FeedbackType,
  PAGINATION_DEFAULTS,
  type FeedbackView as FeedbackRecord,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import { feedbackApi } from '@/api/feedback.api';
import { useToast } from '@/composables/use-toast';
import './FeedbackView.responsive.css';

/** 页签下标 → 反馈类型（与 SegmentTabs 的 tabs 顺序一致） */
const TYPE_ORDER: FeedbackType[] = [
  FeedbackType.Booster,
  FeedbackType.Service,
  FeedbackType.Other,
];
const TYPE_TABS = TYPE_ORDER.map((t) => FEEDBACK_TYPE_TEXT[t]);

const router = useRouter();
const toast = useToast();

const typeIndex = ref(0);
const target = ref('');
const content = ref('');
const submitting = ref(false);

const records = ref<FeedbackRecord[]>([]);
const loadingRecords = ref(true);

function statusText(record: FeedbackRecord): string {
  return record.status === FeedbackStatus.Resolved ? '已处理' : '处理中';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadRecords(): Promise<void> {
  loadingRecords.value = true;
  try {
    const res = await feedbackApi.mine(
      PAGINATION_DEFAULTS.page,
      PAGINATION_DEFAULTS.pageSize,
    );
    records.value = res.list;
  } finally {
    loadingRecords.value = false;
  }
}

async function submit(): Promise<void> {
  const text = content.value.trim();
  if (text.length < FEEDBACK_LIMITS.contentMin) {
    toast.show(`请至少填写 ${FEEDBACK_LIMITS.contentMin} 个字的反馈内容`);
    return;
  }
  submitting.value = true;
  try {
    await feedbackApi.submit({
      type: TYPE_ORDER[typeIndex.value],
      target: target.value.trim() || undefined,
      content: text,
    });
    toast.show('反馈已提交，我们会尽快处理');
    target.value = '';
    content.value = '';
    await loadRecords();
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.back();
}

onMounted(loadRecords);
</script>

<template>
  <div class="feedback">
    <header class="bar">
      <div class="bar-inner">
        <button
          class="back"
          aria-label="返回"
          @click="goBack"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <div class="bar-title">
          <span class="name">投诉反馈</span>
          <span class="tip">对客服/打手不满意？告诉我们</span>
        </div>
      </div>
    </header>

    <div class="scroll">
      <section class="form card">
        <h2 class="sec-title">
          提交反馈
        </h2>
        <SegmentTabs
          v-model="typeIndex"
          :tabs="TYPE_TABS"
        />
        <input
          v-model="target"
          class="input"
          type="text"
          :maxlength="FEEDBACK_LIMITS.targetMax"
          placeholder="被投诉对象（昵称/单号，选填）"
        >
        <textarea
          v-model="content"
          class="textarea"
          :maxlength="FEEDBACK_LIMITS.contentMax"
          placeholder="请描述具体情况（时间、经过、诉求），以便我们尽快核实处理"
        />
        <button
          class="submit"
          :disabled="submitting || !content.trim()"
          @click="submit"
        >
          {{ submitting ? '提交中…' : '提交反馈' }}
        </button>
      </section>

      <section class="history card">
        <h2 class="sec-title">
          我的反馈
        </h2>
        <p
          v-if="loadingRecords"
          class="hint"
        >
          加载中…
        </p>
        <p
          v-else-if="!records.length"
          class="hint"
        >
          暂无反馈记录
        </p>
        <div
          v-for="record in records"
          v-else
          :key="record.id"
          class="record"
        >
          <div class="record-head">
            <span class="record-type">{{ FEEDBACK_TYPE_TEXT[record.type] }}</span>
            <span
              class="record-status"
              :class="{ resolved: record.status === FeedbackStatus.Resolved }"
            >{{ statusText(record) }}</span>
          </div>
          <p
            v-if="record.target"
            class="record-target"
          >
            对象：{{ record.target }}
          </p>
          <p class="record-content">
            {{ record.content }}
          </p>
          <p
            v-if="record.replyContent"
            class="record-reply"
          >
            官方回复：{{ record.replyContent }}
          </p>
          <span class="record-time">{{ formatDate(record.createdAt) }}</span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.feedback {
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

.bar-title {
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
  gap: 16px;
}

.form,
.history {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input,
.textarea {
  width: 100%;
  padding: 10px 12px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.textarea {
  min-height: 110px;
  resize: vertical;
  line-height: 1.5;
}

.submit {
  height: 42px;
  font-weight: 700;
  color: #0b0e14;
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-muted);
  padding: 12px 0;
}

.record {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-type {
  font-size: 13px;
  font-weight: 700;
  color: var(--c-accent);
}

.record-status {
  font-size: 12px;
  color: var(--c-text-muted);
}

.record-status.resolved {
  color: var(--c-accent);
}

.record-target {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.record-content {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.record-reply {
  font-size: 13px;
  line-height: 1.5;
  color: var(--c-text-secondary);
  padding: 8px 10px;
  background: var(--c-accent-dim);
  border-radius: var(--radius-sm);
}

.record-time {
  font-size: 11px;
  color: var(--c-text-muted);
  text-align: right;
}
</style>
