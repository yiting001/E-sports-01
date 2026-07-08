<script setup lang="ts">
/**
 * 分发人管理抽屉：定向券指派/移除分发人（客服/打手等任意用户）。
 * 一人一码，C 端凭分发码链接领取并归因；分发人在 C 端「推广发券」页复制自己的链接。
 */
import { ref, watch } from 'vue';
import type {
  CouponDistributorCandidate,
  CouponDistributorView,
} from '@app/contracts';
import { Delete, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { couponApi } from '@/api/coupon.api';

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ couponId: string; couponTitle: string }>();

const list = ref<CouponDistributorView[]>([]);
const loading = ref(false);
const adding = ref(false);
const selectedUserId = ref('');
const candidates = ref<CouponDistributorCandidate[]>([]);
const candidateLoading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    list.value = await couponApi.distributors(props.couponId);
  } finally {
    loading.value = false;
  }
}

/** 远程搜索候选用户（用户名/昵称） */
async function searchCandidates(keyword: string): Promise<void> {
  candidateLoading.value = true;
  try {
    const res = await couponApi.distributorCandidates(keyword);
    candidates.value = res.list;
  } finally {
    candidateLoading.value = false;
  }
}

async function add(): Promise<void> {
  if (!selectedUserId.value) {
    ElMessage.warning('请选择分发人');
    return;
  }
  adding.value = true;
  try {
    await couponApi.addDistributor(props.couponId, selectedUserId.value);
    ElMessage.success('已添加');
    selectedUserId.value = '';
    await load();
  } finally {
    adding.value = false;
  }
}

async function remove(row: CouponDistributorView): Promise<void> {
  await ElMessageBox.confirm(
    `确认移除分发人「${row.nickname || row.username}」？已领出的券不受影响。`,
    '提示',
    { type: 'warning' },
  );
  await couponApi.removeDistributor(props.couponId, row.id);
  ElMessage.success('已移除');
  await load();
}

async function copyCode(row: CouponDistributorView): Promise<void> {
  await navigator.clipboard.writeText(row.code);
  ElMessage.success('分发码已复制');
}

watch(visible, (value) => {
  if (value) {
    void load();
    void searchCandidates('');
  }
});
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="`分发人管理 - ${props.couponTitle}`"
    size="640px"
    class="admin-drawer"
    destroy-on-close
  >
    <div class="distributor-add">
      <el-select
        v-model="selectedUserId"
        filterable
        remote
        clearable
        reserve-keyword
        placeholder="搜索用户名/昵称选择分发人"
        :remote-method="searchCandidates"
        :loading="candidateLoading"
        class="distributor-add__select"
      >
        <el-option
          v-for="candidate in candidates"
          :key="candidate.id"
          :label="`${candidate.nickname}（${candidate.username}）`"
          :value="candidate.id"
        />
      </el-select>
      <el-button
        type="primary"
        :icon="Plus"
        :loading="adding"
        @click="add"
      >
        添加分发人
      </el-button>
    </div>
    <p class="distributor-hint">
      分发人在 C 端「我的 → 推广发券」中复制专属领取链接，用户经链接领取后归因到对应分发人。
    </p>

    <el-table
      v-loading="loading"
      :data="list"
      empty-text="暂无分发人"
    >
      <el-table-column
        label="分发人"
        min-width="160"
      >
        <template #default="{ row }">
          <span>{{ row.nickname }}</span>
          <span class="distributor-muted">（{{ row.username }}）</span>
        </template>
      </el-table-column>
      <el-table-column
        label="分发码"
        min-width="140"
      >
        <template #default="{ row }">
          <el-link
            type="primary"
            @click="copyCode(row)"
          >
            {{ row.code }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column
        label="经其领取"
        width="100"
      >
        <template #default="{ row }">
          {{ row.claimedCount }} 张
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="90"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            link
            type="danger"
            :icon="Delete"
            @click="remove(row)"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-drawer>
</template>

<style scoped>
.distributor-add {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.distributor-add__select {
  flex: 1;
}

.distributor-hint {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.distributor-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
