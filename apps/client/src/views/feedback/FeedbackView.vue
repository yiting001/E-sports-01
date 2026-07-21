<script setup lang="ts">
/**
 * 投诉反馈页（全屏）：投诉打手时关联本人履约订单，投诉客服/其他时填写对象，
 * 提交内容后展示历史反馈及处理进度/回复。首页「投诉客服/打手」入口进入。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FEEDBACK_LIMITS,
  FEEDBACK_TYPE_TEXT,
  ORDER_STATUS_TEXT,
  FeedbackStatus,
  FeedbackType,
  PAGINATION_DEFAULTS,
  type FeedbackView as FeedbackRecord,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import { feedbackApi } from '@/api/feedback.api';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';
import {
  buildSubmitFeedbackPayload,
  loadFeedbackOrderOptions,
  type FeedbackOrderOption,
} from '@/utils/feedback-orders';
import './FeedbackView.responsive.css';

/** 页签下标 → 反馈类型（与 SegmentTabs 的 tabs 顺序一致） */
const TYPE_ORDER: FeedbackType[] = [FeedbackType.Booster, FeedbackType.Service, FeedbackType.Other];
const TYPE_TABS = TYPE_ORDER.map((t) => FEEDBACK_TYPE_TEXT[t]);

const router = useRouter();
const toast = useToast();

const typeIndex = ref(0);
const target = ref('');
const content = ref('');
const submitting = ref(false);
const orderOptions = ref<FeedbackOrderOption[]>([]);
const selectedOrderId = ref('');
const loadingOrders = ref(true);
const orderLoadError = ref(false);

const records = ref<FeedbackRecord[]>([]);
const loadingRecords = ref(true);
const recordLoadError = ref(false);

const currentType = computed(() => TYPE_ORDER[typeIndex.value] ?? FeedbackType.Booster);
const isBoosterFeedback = computed(() => currentType.value === FeedbackType.Booster);
const selectedOrder = computed(
  () => orderOptions.value.find((order) => order.id === selectedOrderId.value) ?? null,
);
const submitDisabled = computed(
  () =>
    submitting.value || !content.value.trim() || (isBoosterFeedback.value && !selectedOrder.value),
);

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
  recordLoadError.value = false;
  try {
    const res = await feedbackApi.mine(PAGINATION_DEFAULTS.page, PAGINATION_DEFAULTS.pageSize);
    records.value = res.list;
  } catch {
    records.value = [];
    recordLoadError.value = true;
  } finally {
    loadingRecords.value = false;
  }
}

async function loadOrders(): Promise<void> {
  loadingOrders.value = true;
  orderLoadError.value = false;
  try {
    orderOptions.value = await loadFeedbackOrderOptions(
      orderApi.mine,
      PAGINATION_DEFAULTS.maxPageSize,
    );
    if (!selectedOrder.value) {
      selectedOrderId.value = '';
    }
  } catch {
    orderOptions.value = [];
    selectedOrderId.value = '';
    orderLoadError.value = true;
  } finally {
    loadingOrders.value = false;
  }
}

async function submit(): Promise<void> {
  const text = content.value.trim();
  if (text.length < FEEDBACK_LIMITS.contentMin) {
    toast.show(`请至少填写 ${FEEDBACK_LIMITS.contentMin} 个字的反馈内容`);
    return;
  }
  if (isBoosterFeedback.value && !selectedOrder.value) {
    toast.show('请选择要投诉的订单');
    return;
  }

  const type = currentType.value;
  submitting.value = true;
  try {
    await feedbackApi.submit(
      buildSubmitFeedbackPayload(type, selectedOrderId.value, target.value, text),
    );
    toast.show('反馈已提交，我们会尽快处理');
    target.value = '';
    selectedOrderId.value = '';
    content.value = '';
    await loadRecords();
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.back();
}

onMounted(() => {
  void loadRecords();
  void loadOrders();
});
</script>

<template>
  <div class="feedback client-page">
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
        <div
          v-if="isBoosterFeedback"
          class="order-picker"
        >
          <p
            v-if="loadingOrders"
            class="order-picker-state"
            aria-live="polite"
          >
            正在加载可投诉订单…
          </p>
          <div
            v-else-if="orderLoadError"
            class="order-picker-state order-picker-state--error"
            role="alert"
          >
            <span>订单加载失败</span>
            <button
              type="button"
              class="retry"
              @click="loadOrders"
            >
              重试
            </button>
          </div>
          <p
            v-else-if="!orderOptions.length"
            class="order-picker-state"
          >
            暂无服务中或已完成的可投诉订单
          </p>
          <template v-else>
            <label class="order-field">
              <span class="field-label">关联订单</span>
              <select
                v-model="selectedOrderId"
                class="select"
              >
                <option
                  disabled
                  value=""
                >请选择订单</option>
                <option
                  v-for="order in orderOptions"
                  :key="order.id"
                  :value="order.id"
                >
                  {{ order.orderNo }} · {{ order.boosterName || '打手名称未记录' }} ·
                  {{ ORDER_STATUS_TEXT[order.status] }}
                </option>
              </select>
            </label>
            <div
              v-if="selectedOrder"
              class="order-summary"
            >
              <span>订单号<strong>{{ selectedOrder.orderNo }}</strong></span>
              <span>实际打手<strong>{{ selectedOrder.boosterName || '名称未记录' }}</strong></span>
            </div>
          </template>
        </div>
        <input
          v-else
          v-model="target"
          class="input"
          type="text"
          :maxlength="FEEDBACK_LIMITS.targetMax"
          placeholder="被投诉对象（昵称，选填）"
        >
        <textarea
          v-model="content"
          class="textarea"
          :maxlength="FEEDBACK_LIMITS.contentMax"
          placeholder="请描述具体情况（时间、经过、诉求），以便我们尽快核实处理"
        />
        <button
          class="submit"
          :disabled="submitDisabled"
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
        <div
          v-else-if="recordLoadError"
          class="order-picker-state order-picker-state--error"
          role="alert"
        >
          <span>反馈记录加载失败</span>
          <button
            type="button"
            class="retry"
            @click="loadRecords"
          >
            重试
          </button>
        </div>
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
          <div
            v-if="record.orderNo"
            class="record-order"
          >
            <span>订单：{{ record.orderNo }}</span>
            <span>实际打手：{{ record.boosterName || '名称未记录' }}</span>
          </div>
          <p
            v-else-if="record.target"
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
  background: radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
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
.select,
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
</style>
