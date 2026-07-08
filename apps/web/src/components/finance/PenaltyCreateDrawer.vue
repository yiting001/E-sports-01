<script setup lang="ts">
import {
  FEN_PER_YUAN,
  PENALTY_LIMITS,
  PENALTY_SOURCE_TEXT,
  PERMS,
  PenaltySource,
} from '@app/contracts';
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { financeApi } from '@/api/finance.api';

const props = defineProps<{
  /** 抽屉显隐（v-model） */
  modelValue: boolean;
  /** 快速扣款场景预填的打手用户 id；为空时允许手动填写 */
  boosterUserId?: string;
  /** 快速扣款场景展示用的打手名称 */
  boosterName?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  /** 创建成功后通知父页面刷新列表 */
  saved: [];
}>();

const creating = ref(false);
const createForm = reactive({
  boosterUserId: '',
  amountYuan: 0,
  source: PenaltySource.Balance,
  reason: '',
  orderNo: '',
});

const sourceOptions = Object.values(PenaltySource).map((source) => ({
  label: PENALTY_SOURCE_TEXT[source],
  value: source,
}));

const isBoosterLocked = computed(() => Boolean(props.boosterUserId));
const title = computed(() => (props.boosterName ? `创建罚款 · ${props.boosterName}` : '创建罚款'));

function resetForm(): void {
  createForm.boosterUserId = props.boosterUserId ?? '';
  createForm.amountYuan = 0;
  createForm.source = PenaltySource.Balance;
  createForm.reason = '';
  createForm.orderNo = '';
}

async function submitCreate(): Promise<void> {
  if (!createForm.boosterUserId.trim()) {
    ElMessage.warning('请填写被罚打手的用户 ID');
    return;
  }
  const amountFen = Math.round(createForm.amountYuan * FEN_PER_YUAN);
  if (amountFen <= 0) {
    ElMessage.warning('罚款金额须大于 0');
    return;
  }
  if (!createForm.reason.trim()) {
    ElMessage.warning('罚款理由不能为空');
    return;
  }
  creating.value = true;
  try {
    await financeApi.createPenalty({
      boosterUserId: createForm.boosterUserId.trim(),
      amountFen,
      source: createForm.source,
      reason: createForm.reason.trim(),
      orderNo: createForm.orderNo.trim() || undefined,
    });
    ElMessage.success('罚款已创建并完成扣除');
    emit('saved');
    emit('update:modelValue', false);
  } finally {
    creating.value = false;
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
    class="admin-drawer penalty-create-drawer"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <el-form
      class="penalty-create-form"
      label-width="110px"
      @submit.prevent
    >
      <el-form-item label="打手用户 ID">
        <el-input
          v-model="createForm.boosterUserId"
          :disabled="isBoosterLocked"
          placeholder="被罚打手的用户 ID"
        />
      </el-form-item>
      <el-form-item label="罚款金额（元）">
        <el-input-number
          v-model="createForm.amountYuan"
          :min="0"
          :step="1"
          :precision="2"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="扣除来源">
        <el-radio-group
          v-model="createForm.source"
          class="penalty-source-group"
        >
          <el-radio
            v-for="opt in sourceOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="关联订单号">
        <el-input
          v-model="createForm.orderNo"
          :maxlength="PENALTY_LIMITS.orderNoMax"
          placeholder="选填"
        />
      </el-form-item>
      <el-form-item label="罚款理由">
        <el-input
          v-model="createForm.reason"
          type="textarea"
          :rows="3"
          :maxlength="PENALTY_LIMITS.reasonMax"
          show-word-limit
          placeholder="必填，供审计追溯"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="emit('update:modelValue', false)">
          取消
        </el-button>
        <el-button
          v-permission="PERMS.finance.penaltyCreate"
          type="primary"
          :loading="creating"
          @click="submitCreate"
        >
          确认罚款
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.penalty-create-form {
  max-width: 100%;
}

.penalty-source-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.penalty-source-group .el-radio {
  margin-right: 0;
}
</style>
