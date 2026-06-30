<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  RealnameStatus,
  type RealnameView,
  type RoleView,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import RealnamePolicyPanel from '@/components/realname/RealnamePolicyPanel.vue';
import RealnameReviewDirectory from '@/components/realname/RealnameReviewDirectory.vue';
import RealnameStats from '@/components/realname/RealnameStats.vue';
import { realnameApi } from '@/api/realname.api';
import { roleApi } from '@/api/role.api';
import './RealnameAdminView.css';
import './RealnameAdminView.responsive.css';

const list = ref<RealnameView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const statusFilter = ref<RealnameStatus | undefined>(undefined);
const loading = ref(false);

const statusMeta: Record<
  RealnameStatus,
  { text: string; type: 'info' | 'warning' | 'success' | 'danger' }
> = {
  [RealnameStatus.None]: { text: '未认证', type: 'info' },
  [RealnameStatus.Pending]: { text: '审核中', type: 'warning' },
  [RealnameStatus.Approved]: { text: '已通过', type: 'success' },
  [RealnameStatus.Rejected]: { text: '已驳回', type: 'danger' },
};

const statusOptions = [
  { label: '全部', value: undefined },
  { label: '审核中', value: RealnameStatus.Pending },
  { label: '已通过', value: RealnameStatus.Approved },
  { label: '已驳回', value: RealnameStatus.Rejected },
];

const pendingCount = computed(
  () => list.value.filter((item) => item.status === RealnameStatus.Pending).length,
);
const approvedCount = computed(
  () => list.value.filter((item) => item.status === RealnameStatus.Approved).length,
);

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await realnameApi.list(page.value, pageSize.value, statusFilter.value);
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function changePage(value: number): Promise<void> {
  page.value = value;
  await load();
}

async function changePageSize(value: number): Promise<void> {
  pageSize.value = value;
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function onFilterChange(): Promise<void> {
  page.value = 1;
  await load();
}

async function approve(row: RealnameView): Promise<void> {
  await ElMessageBox.confirm(`确认通过 ${row.username} 的实名认证？`, '审核通过', {
    type: 'warning',
  });
  await realnameApi.review(row.id, { approve: true });
  ElMessage.success('已通过');
  await load();
}

async function reject(row: RealnameView): Promise<void> {
  const { value } = await ElMessageBox.prompt(`请输入驳回 ${row.username} 的理由`, '驳回', {
    inputPattern: /\S+/,
    inputErrorMessage: '驳回理由不能为空',
  });
  await realnameApi.review(row.id, { approve: false, rejectReason: value });
  ElMessage.success('已驳回');
  await load();
}

const roles = ref<RoleView[]>([]);
const selectedRoleCodes = ref<string[]>([]);
const policyLoading = ref(false);
const policySaving = ref(false);

async function loadPolicy(): Promise<void> {
  policyLoading.value = true;
  try {
    const [roleRes, policy] = await Promise.all([
      roleApi.list(1, PAGINATION_DEFAULTS.maxPageSize),
      realnameApi.getPolicy(),
    ]);
    roles.value = roleRes.list.filter((role) => !role.isSuper);
    selectedRoleCodes.value = policy.requiredRoleCodes;
  } finally {
    policyLoading.value = false;
  }
}

async function savePolicy(): Promise<void> {
  policySaving.value = true;
  try {
    await realnameApi.setPolicy({ requiredRoleCodes: selectedRoleCodes.value });
    ElMessage.success('实名策略已保存');
  } finally {
    policySaving.value = false;
  }
}

onMounted(() => {
  void load();
  void loadPolicy();
});
</script>

<template>
  <section class="admin-page realname-page">
    <realname-stats
      :total="total"
      :pending-count="pendingCount"
      :approved-count="approvedCount"
      :required-role-count="selectedRoleCodes.length"
    />
    <realname-review-directory
      v-model:status-filter="statusFilter"
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :status-options="statusOptions"
      :status-meta="statusMeta"
      :format-date="formatDate"
      @filter="onFilterChange"
      @refresh="load"
      @approve="approve"
      @reject="reject"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
    <realname-policy-panel
      v-model:selected-role-codes="selectedRoleCodes"
      :roles="roles"
      :loading="policyLoading"
      :saving="policySaving"
      @refresh="loadPolicy"
      @save="savePolicy"
    />
  </section>
</template>
