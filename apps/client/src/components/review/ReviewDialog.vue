<script setup lang="ts">
/**
 * 订单评价弹层：对已完成订单打星 + 填写评论，提交成功后通知父组件。
 * 与 PayDialog 同一弹层交互风格（遮罩点击空白关闭）。
 */
import { computed, ref } from 'vue';
import { REVIEW_LIMITS, type OrderView } from '@app/contracts';
import RatingStars from '@/components/review/RatingStars.vue';
import { reviewApi } from '@/api/review.api';
import { useToast } from '@/composables/use-toast';

const props = defineProps<{ order: OrderView }>();
const emit = defineEmits<{ submitted: []; close: [] }>();

const toast = useToast();

const rating = ref(REVIEW_LIMITS.ratingMax);
const content = ref('');
const submitting = ref(false);

const canSubmit = computed(
  () => content.value.trim().length >= REVIEW_LIMITS.contentMin,
);

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) {
    return;
  }
  submitting.value = true;
  try {
    await reviewApi.submit({
      orderId: props.order.id,
      rating: rating.value,
      content: content.value.trim(),
    });
    toast.show('评价成功，感谢你的反馈');
    emit('submitted');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div
    class="mask"
    @click.self="emit('close')"
  >
    <div class="dialog card">
      <h3 class="title">
        评价订单
      </h3>
      <p class="product">
        {{ order.productTitle }}
      </p>
      <RatingStars
        v-model="rating"
        interactive
        :size="26"
      />
      <textarea
        v-model="content"
        class="input"
        rows="4"
        :maxlength="REVIEW_LIMITS.contentMax"
        placeholder="说说这次服务体验吧"
      />
      <div class="actions">
        <button
          class="cancel"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          class="submit"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          {{ submitting ? '提交中…' : '提交评价' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
}

.dialog {
  width: min(340px, calc(100vw - 48px));
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.product {
  max-width: 100%;
  font-size: 13px;
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  resize: none;
}

.input:focus {
  outline: none;
  border-color: var(--c-accent);
}

.actions {
  width: 100%;
  display: flex;
  gap: 10px;
}

.cancel {
  flex: 1;
  padding: 9px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.submit {
  flex: 2;
  padding: 9px 0;
  font-size: 13px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.submit:disabled {
  opacity: 0.5;
}
</style>
