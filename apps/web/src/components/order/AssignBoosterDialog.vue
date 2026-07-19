<script setup lang="ts">
/**
 * 指派打手弹窗：远程搜索平台打手候选（仅打手角色用户），
 * 选定后调用指派接口把订单交由该打手服务。
 */
import { ref, watch } from "vue";
import type { AdminOrderView, ServiceAgentOption } from "@app/contracts";
import { ElMessage } from "element-plus";
import { orderApi } from "@/api/order.api";

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ order: AdminOrderView | null }>();
const emit = defineEmits<{ assigned: [] }>();

const CANDIDATE_PAGE_SIZE = 20;

const boosterId = ref("");
const options = ref<ServiceAgentOption[]>([]);
const searching = ref(false);
const submitting = ref(false);
const requestedCandidateAvailable = ref(false);

async function search(keyword: string): Promise<void> {
  searching.value = true;
  try {
    const res = await orderApi.boosterCandidates(
      1,
      CANDIDATE_PAGE_SIZE,
      keyword.trim()
    );
    options.value = res.list;
    const requestedId = props.order?.requestedBoosterId;
    requestedCandidateAvailable.value = Boolean(
      requestedId && options.value.some((item) => item.id === requestedId)
    );
  } finally {
    searching.value = false;
  }
}

watch(visible, (open) => {
  if (!open) {
    return;
  }
  boosterId.value = "";
  requestedCandidateAvailable.value = false;
  void prepareCandidates();
});

async function prepareCandidates(): Promise<void> {
  const target = props.order;
  if (!target) {
    options.value = [];
    return;
  }
  await search(target.requestedBoosterId || target.requestedBoosterName || "");
  if (
    !visible.value ||
    props.order?.id !== target.id ||
    !target.requestedBoosterId
  ) {
    return;
  }
  requestedCandidateAvailable.value = options.value.some(
    (item) => item.id === target.requestedBoosterId
  );
  if (requestedCandidateAvailable.value) {
    boosterId.value = target.requestedBoosterId;
  }
}

async function submit(): Promise<void> {
  if (!props.order || !boosterId.value) {
    ElMessage.warning("请选择要指派的打手");
    return;
  }
  submitting.value = true;
  try {
    await orderApi.assign(props.order.id, boosterId.value);
    ElMessage.success("已指派打手，订单进入服务中");
    visible.value = false;
    emit("assigned");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="指派打手"
    width="420px"
  >
    <p class="assign-tip">
      订单 {{ props.order?.orderNo }}：选择平台打手，指派后订单进入「服务中」，
      打手将自动加入订单群联系客户。
    </p>
    <el-alert
      v-if="props.order?.requestedBoosterId"
      :type="requestedCandidateAvailable ? 'info' : 'warning'"
      :closable="false"
      show-icon
      class="requested-booster-alert"
    >
      <template #title>
        老板指定：{{
          props.order.requestedBoosterName || props.order.requestedBoosterId
        }}
      </template>
      <template #default>
        {{
          requestedCandidateAvailable
            ? "已按当前候选结果预选，请确认后指派。"
            : "当前候选结果中不可用，请搜索并核实后再指派。"
        }}
      </template>
    </el-alert>
    <el-select
      v-model="boosterId"
      filterable
      remote
      clearable
      :remote-method="search"
      :loading="searching"
      placeholder="按用户名/昵称搜索打手"
      class="assign-select"
    >
      <el-option
        v-for="item in options"
        :key="item.id"
        :label="
          item.nickname ? `${item.nickname}（${item.username}）` : item.username
        "
        :value="item.id"
      />
    </el-select>
    <template #footer>
      <el-button @click="visible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        @click="submit"
      >
        确认指派
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.assign-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.assign-select {
  width: 100%;
}

.requested-booster-alert {
  margin-bottom: 12px;
}
</style>
