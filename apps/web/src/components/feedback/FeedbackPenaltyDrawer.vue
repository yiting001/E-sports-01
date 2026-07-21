<script setup lang="ts">
import {
  FEEDBACK_LIMITS,
  FEN_PER_YUAN,
  PENALTY_LIMITS,
  PENALTY_SOURCE_TEXT,
  PERMS,
  FeedbackStatus,
  FeedbackType,
  PenaltySource,
  type CreateFeedbackPenaltyBody,
  type FeedbackView,
} from '@app/contracts';
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { feedbackApi } from '@/api/feedback.api';

const props = defineProps<{
  modelValue: boolean;
  feedback: FeedbackView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [feedback: FeedbackView];
}>();

const submitting = ref(false);
const form = reactive({
  amountYuan: 0,
  source: PenaltySource.Balance,
  reason: '',
  replyContent: '',
});

const sourceOptions = Object.values(PenaltySource).map((source) => ({
  label: PENALTY_SOURCE_TEXT[source],
  value: source,
}));

const title = computed(() => {
  const boosterName = props.feedback?.boosterName;
  return boosterName ? `投诉扣款 · ${boosterName}` : '投诉扣款';
});

function resetForm(): void {
  form.amountYuan = 0;
  form.source = PenaltySource.Balance;
  form.reason = '';
  form.replyContent = '';
}

function buildPayload(): CreateFeedbackPenaltyBody | null {
  const amountFen = Math.round(form.amountYuan * FEN_PER_YUAN);
  if (!Number.isSafeInteger(amountFen) || amountFen <= 0) {
    ElMessage.warning('扣款金额须大于 0');
    return null;
  }
  const reason = form.reason.trim();
  if (!reason) {
    ElMessage.warning('处罚原因不能为空');
    return null;
  }
  const replyContent = form.replyContent.trim();
  if (!replyContent) {
    ElMessage.warning('用户可见回复不能为空');
    return null;
  }
  return {
    amountFen,
    source: form.source,
    reason,
    replyContent,
  };
}

async function submit(): Promise<void> {
  if (submitting.value) {
    return;
  }
  const feedback = props.feedback;
  if (
    !feedback ||
    feedback.type !== FeedbackType.Booster ||
    feedback.status !== FeedbackStatus.Pending ||
    feedback.penaltyId ||
    !feedback.orderId ||
    !feedback.orderNo ||
    !feedback.boosterUserId ||
    !feedback.boosterName
  ) {
    ElMessage.warning('投诉缺少关联订单或打手信息，无法扣款');
    return;
  }
  const payload = buildPayload();
  if (!payload) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认从「${
        PENALTY_SOURCE_TEXT[payload.source]
      }」扣除 ${form.amountYuan.toFixed(2)} 元？扣款后投诉将直接标记为已处理。`,
      '确认投诉扣款',
      {
        type: 'warning',
        confirmButtonText: '确认扣款',
        cancelButtonText: '返回检查',
      },
    );
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    throw error;
  }

  submitting.value = true;
  try {
    const updated = await feedbackApi.createPenalty(feedback.id, payload);
    ElMessage.success('扣款已完成并回复用户');
    emit('saved', updated);
    emit('update:modelValue', false);
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm();
    }
  },
);
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="title"
    size="520px"
    class="admin-drawer feedback-penalty-drawer"
    destroy-on-close
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <el-form
      class="feedback-penalty-form"
      label-width="120px"
      @submit.prevent
    >
      <el-form-item label="关联订单">
        <el-input
          :model-value="feedback?.orderNo || ''"
          disabled
        />
      </el-form-item>
      <el-form-item label="被投诉打手">
        <el-input
          :model-value="feedback?.boosterName || ''"
          disabled
        />
      </el-form-item>
      <el-form-item label="打手用户 ID">
        <el-input
          :model-value="feedback?.boosterUserId || ''"
          disabled
        />
      </el-form-item>
      <el-form-item label="扣款金额（元）">
        <el-input-number
          v-model="form.amountYuan"
          :min="0"
          :step="1"
          :precision="2"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="扣除来源">
        <el-radio-group
          v-model="form.source"
          class="feedback-penalty-source"
        >
          <el-radio
            v-for="option in sourceOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="处罚原因">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          :maxlength="PENALTY_LIMITS.reasonMax"
          show-word-limit
          placeholder="必填，供审计追溯"
        />
      </el-form-item>
      <el-form-item label="用户可见回复">
        <el-input
          v-model="form.replyContent"
          type="textarea"
          :rows="4"
          :maxlength="FEEDBACK_LIMITS.replyMax"
          show-word-limit
          placeholder="必填，将作为本次投诉的处理回复"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="admin-drawer__footer">
        <el-button
          :disabled="submitting"
          @click="emit('update:modelValue', false)"
        >
          取消
        </el-button>
        <el-button
          v-permission="[PERMS.feedback.handle, PERMS.finance.penaltyCreate]"
          type="danger"
          :loading="submitting"
          @click="submit"
        >
          确认扣款
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.feedback-penalty-form {
  max-width: 100%;
}

.feedback-penalty-form :deep(.el-input-number) {
  width: 100%;
}

.feedback-penalty-source {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.feedback-penalty-source .el-radio {
  margin-right: 0;
}
</style>
