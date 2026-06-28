<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  RealnameStatus,
  type RealnameView,
  type RoleView,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { realnameApi } from '@/api/realname.api';
import { roleApi } from '@/api/role.api';

/**
 * 实名管理后台：审核用户提交的实名信息（通过/驳回），并配置「哪些角色需实名」。
 */
const activeTab = ref<'review' | 'policy'>('review');

/** —— 审核列表 —— */
const list = ref<RealnameView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(PAGINATION_DEFAULTS.pageSize);
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

async function onFilterChange(): Promise<void> {
  page.value = 1;
  await load();
}

async function approve(row: RealnameView): Promise<void> {
  await ElMessageBox.confirm(
    `确认通过 ${row.username} 的实名认证？`,
    '审核通过',
    { type: 'warning' },
  );
  await realnameApi.review(row.id, { approve: true });
  ElMessage.success('已通过');
  await load();
}

async function reject(row: RealnameView): Promise<void> {
  const { value } = await ElMessageBox.prompt(
    `请输入驳回 ${row.username} 的理由`,
    '驳回',
    {
      inputPattern: /\S+/,
      inputErrorMessage: '驳回理由不能为空',
    },
  );
  await realnameApi.review(row.id, { approve: false, rejectReason: value });
  ElMessage.success('已驳回');
  await load();
}

/** —— 策略设置 —— */
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
    roles.value = roleRes.list.filter((r) => !r.isSuper);
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
  <div class="realname-admin">
    <el-tabs v-model="activeTab">
      <el-tab-pane
        label="实名审核"
        name="review"
      >
        <div class="toolbar">
          <el-select
            v-model="statusFilter"
            class="status-select"
            placeholder="按状态筛选"
            @change="onFilterChange"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button @click="load">
            刷新
          </el-button>
        </div>

        <el-table
          v-loading="loading"
          :data="list"
          border
        >
          <el-table-column
            label="用户"
            min-width="140"
          >
            <template #default="{ row }">
              <div class="user-cell">
                <strong>{{ row.nickname || row.username }}</strong>
                <small>{{ row.username }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="真实姓名"
            prop="realName"
            min-width="100"
          />
          <el-table-column
            label="身份证号"
            prop="idCardMasked"
            min-width="160"
          />
          <el-table-column
            label="证件照"
            min-width="140"
          >
            <template #default="{ row }">
              <div class="image-cell">
                <el-image
                  v-if="row.frontImage"
                  :src="row.frontImage"
                  :preview-src-list="[row.frontImage, row.backImage].filter(Boolean)"
                  fit="cover"
                  class="doc-thumb"
                />
                <el-image
                  v-if="row.backImage"
                  :src="row.backImage"
                  :preview-src-list="[row.backImage, row.frontImage].filter(Boolean)"
                  fit="cover"
                  class="doc-thumb"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            min-width="90"
          >
            <template #default="{ row }">
              <el-tag :type="statusMeta[row.status as RealnameStatus].type">
                {{ statusMeta[row.status as RealnameStatus].text }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="提交时间"
            min-width="150"
          >
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            min-width="150"
            fixed="right"
          >
            <template #default="{ row }">
              <template v-if="row.status === RealnameStatus.Pending">
                <el-button
                  link
                  type="success"
                  @click="approve(row)"
                >
                  通过
                </el-button>
                <el-button
                  link
                  type="danger"
                  @click="reject(row)"
                >
                  驳回
                </el-button>
              </template>
              <span
                v-else
                class="muted"
              >—</span>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="pager"
          layout="prev, pager, next, total"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          @current-change="changePage"
        />
      </el-tab-pane>

      <el-tab-pane
        label="策略设置"
        name="policy"
      >
        <el-card
          v-loading="policyLoading"
          shadow="never"
          class="policy-card"
        >
          <p class="policy-hint">
            勾选的角色将被要求完成实名认证；命中任一所选角色的用户在「实名认证」页会收到提示。
          </p>
          <el-checkbox-group v-model="selectedRoleCodes">
            <el-checkbox
              v-for="role in roles"
              :key="role.code"
              :value="role.code"
            >
              {{ role.name }}（{{ role.code }}）
            </el-checkbox>
          </el-checkbox-group>
          <el-empty
            v-if="roles.length === 0"
            description="暂无可配置的角色"
          />
          <div class="policy-actions">
            <el-button
              type="primary"
              :loading="policySaving"
              @click="savePolicy"
            >
              保存策略
            </el-button>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.status-select {
  width: 160px;
}
.user-cell {
  display: flex;
  flex-direction: column;
}
.user-cell small {
  color: var(--el-text-color-secondary);
}
.image-cell {
  display: flex;
  gap: 6px;
}
.doc-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.muted {
  color: var(--el-text-color-placeholder);
}
.policy-card {
  max-width: 560px;
}
.policy-hint {
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.policy-actions {
  margin-top: 20px;
}
</style>
