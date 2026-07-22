<script setup lang="ts">
/** 用户退款申请弹层：收集必填原因并防止重复提交。 */
import { computed, ref } from "vue";
import { ORDER_REFUND_LIMITS, type OrderView } from "@app/contracts";
import { orderApi } from "@/api/order.api";
import { useToast } from "@/composables/use-toast";

const props = defineProps<{ order: OrderView }>();
const emit = defineEmits<{
  submitted: [order: OrderView];
  close: [];
}>();

const toast = useToast();
const reason = ref("");
const submitting = ref(false);

const normalizedReason = computed(() => reason.value.trim());
const canSubmit = computed(() => normalizedReason.value.length > 0);

function close(): void {
  if (!submitting.value) {
    emit("close");
  }
}

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) {
    return;
  }
  submitting.value = true;
  try {
    const updated = await orderApi.requestRefund(props.order.id, {
      reason: normalizedReason.value,
    });
    toast.show("退款申请已提交，请等待审核");
    emit("submitted", updated);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div
    class="refund-mask"
    role="presentation"
    tabindex="-1"
    @click.self="close"
    @keydown.esc="close"
  >
    <section
      class="refund-dialog card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-dialog-title"
    >
      <h3
        id="refund-dialog-title"
        class="refund-title"
      >
        申请退款
      </h3>
      <p class="refund-order">
        {{ order.productTitle }} · ¥{{ order.amountYuan }}
      </p>
      <p class="refund-warning">
        提交后订单将暂停履约，审核通过后按原支付方式全额退回。
      </p>
      <label class="refund-field">
        <span>退款原因</span>
        <textarea
          v-model="reason"
          rows="4"
          :maxlength="ORDER_REFUND_LIMITS.reasonMax"
          placeholder="请填写退款原因"
          :disabled="submitting"
          autofocus
        />
        <small>{{ reason.length }}/{{ ORDER_REFUND_LIMITS.reasonMax }}</small>
      </label>
      <div class="refund-actions">
        <button
          type="button"
          class="refund-cancel"
          :disabled="submitting"
          @click="close"
        >
          取消
        </button>
        <button
          type="button"
          class="refund-submit"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          {{ submitting ? "提交中…" : "确认申请" }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.refund-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(0 0 0 / 65%);
}

.refund-dialog {
  width: min(360px, 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.refund-title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.refund-order {
  overflow: hidden;
  font-size: 13px;
  color: var(--c-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refund-warning {
  padding: 9px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-accent);
  border-left: 2px solid currentcolor;
  background: var(--c-accent-dim);
}

.refund-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--c-text-secondary);
}

.refund-field textarea {
  width: 100%;
  padding: 10px 12px;
  resize: none;
  font: inherit;
  line-height: 1.6;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-bg);
}

.refund-field textarea:focus {
  outline: none;
  border-color: var(--c-accent);
}

.refund-field small {
  align-self: flex-end;
  font-family: var(--font-num);
  font-size: 10px;
  color: var(--c-text-muted);
}

.refund-actions {
  display: flex;
  gap: 10px;
}

.refund-cancel,
.refund-submit {
  min-height: 38px;
  padding: 8px 16px;
  font-size: 13px;
  border-radius: var(--radius-sm);
}

.refund-cancel {
  flex: 1;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
}

.refund-submit {
  flex: 2;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
}

.refund-cancel:disabled,
.refund-submit:disabled {
  opacity: 0.5;
}
</style>
