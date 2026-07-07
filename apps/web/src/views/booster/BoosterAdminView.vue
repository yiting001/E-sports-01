<script setup lang="ts">
/**
 * 打手管理页（菜单 booster:menu）。
 * 分页展示入驻申请（可按状态过滤），支持审核通过（自动授予 booster 角色）/
 * 驳回（填写理由），以及对打手资料（游戏昵称/擅长游戏/段位/自我介绍）的编辑维护；
 * 另支持等级档位配置（booster:level:set）、押金交付配置（booster:deposit:policy:set）
 * 与押金退还（booster:deposit:refund）。
 */
import { onMounted, reactive, ref } from 'vue';
import {
  BOOSTER_LIMITS,
  BoosterStatus,
  PAGINATION_DEFAULTS,
  PERMS,
  type BoosterView,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Close, Coin, EditPen, Refresh, RefreshLeft, Search, Setting, Trophy } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { boosterApi } from '@/api/booster.api';
import BoosterLevelDialog from './BoosterLevelDialog.vue';
import BoosterDepositPolicyDialog from './BoosterDepositPolicyDialog.vue';
import './BoosterAdminView.css';

const list = ref<BoosterView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const statusFilter = ref<BoosterStatus | undefined>(undefined);
const loading = ref(false);

const statusMeta: Record<
  BoosterStatus,
  { text: string; type: 'info' | 'warning' | 'success' | 'danger' }
> = {
  [BoosterStatus.None]: { text: '未申请', type: 'info' },
  [BoosterStatus.Pending]: { text: '待审核', type: 'warning' },
  [BoosterStatus.Approved]: { text: '已入驻', type: 'success' },
  [BoosterStatus.Rejected]: { text: '已驳回', type: 'danger' },
};

const statusOptions = [
  { label: '全部状态', value: undefined },
  { label: '待审核', value: BoosterStatus.Pending },
  { label: '已入驻', value: BoosterStatus.Approved },
  { label: '已驳回', value: BoosterStatus.Rejected },
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
    const res = await boosterApi.list(page.value, pageSize.value, statusFilter.value);
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

async function approve(row: BoosterView): Promise<void> {
  await ElMessageBox.confirm(
    `确认通过 ${row.nickname || row.username} 的入驻申请？通过后将授予打手角色。`,
    '审核通过',
    { type: 'warning' },
  );
  await boosterApi.review(row.id, { approve: true });
  ElMessage.success('已通过并授予打手角色');
  await load();
}

async function reject(row: BoosterView): Promise<void> {
  const { value } = await ElMessageBox.prompt(
    `请输入驳回 ${row.nickname || row.username} 的理由`,
    '驳回申请',
    { inputPattern: /\S+/, inputErrorMessage: '驳回理由不能为空' },
  );
  await boosterApi.review(row.id, { approve: false, rejectReason: value });
  ElMessage.success('已驳回');
  await load();
}

const levelDialogVisible = ref(false);
const depositPolicyVisible = ref(false);

async function refundDeposit(row: BoosterView): Promise<void> {
  await ElMessageBox.confirm(
    `确认退还 ${row.nickname || row.username} 的押金？将全额退回其钱包余额。`,
    '退还押金',
    { type: 'warning' },
  );
  await boosterApi.refundDeposit(row.id);
  ElMessage.success('押金已退还');
  await load();
}

const editVisible = ref(false);
const editSaving = ref(false);
const editingId = ref('');
const editForm = reactive({ gameNickname: '', gameName: '', rank: '', intro: '' });

function openEdit(row: BoosterView): void {
  editingId.value = row.id;
  editForm.gameNickname = row.gameNickname;
  editForm.gameName = row.gameName;
  editForm.rank = row.rank;
  editForm.intro = row.intro;
  editVisible.value = true;
}

async function saveEdit(): Promise<void> {
  if (
    !editForm.gameNickname.trim() ||
    !editForm.gameName.trim() ||
    !editForm.rank.trim() ||
    !editForm.intro.trim()
  ) {
    ElMessage.warning('各字段均不能为空');
    return;
  }
  editSaving.value = true;
  try {
    await boosterApi.update(editingId.value, { ...editForm });
    ElMessage.success('打手资料已更新');
    editVisible.value = false;
    await load();
  } finally {
    editSaving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page booster-page">
    <app-panel
      title="打手入驻管理"
      eyebrow="Booster Onboarding"
      description="审核打手入驻申请，维护资料、等级、押金与履约状态"
    >
      <template #actions>
        <div class="admin-actions">
          <el-select
            v-model="statusFilter"
            class="booster-filter"
            placeholder="按状态筛选"
            :prefix-icon="Search"
            @change="onFilterChange"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value ?? 'all'"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button
            v-permission="PERMS.booster.levelSet"
            :icon="Setting"
            @click="levelDialogVisible = true"
          >
            等级配置
          </el-button>
          <el-button
            v-permission="PERMS.booster.depositPolicySet"
            :icon="Coin"
            @click="depositPolicyVisible = true"
          >
            押金配置
          </el-button>
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="980"
        table-class="booster-table"
        empty-text="暂无入驻申请"
      >
        <el-table-column
          label="打手信息"
          min-width="240"
        >
          <template #default="{ row }">
            <div class="booster-user">
              <span class="booster-user__avatar">
                <el-icon><Trophy /></el-icon>
              </span>
              <div>
                <strong>{{ row.nickname || row.username }}</strong>
                <small>{{ row.username }}</small>
                <span>{{ row.gameNickname || '未填写游戏昵称' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="能力资料"
          min-width="300"
        >
          <template #default="{ row }">
            <div class="booster-profile">
              <span>擅长：{{ row.gameName || '-' }}</span>
              <span>段位：{{ row.rank || '-' }}</span>
              <span class="booster-content">{{ row.intro || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="等级与履约"
          width="180"
        >
          <template #default="{ row }">
            <div class="booster-metrics">
              <el-tag
                round
                effect="plain"
              >
                Lv.{{ row.level }} {{ row.levelName }}
              </el-tag>
              <span>完成 {{ row.completedOrders }} 单</span>
              <span>押金 ¥{{ (row.depositFen / 100).toFixed(2) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          min-width="210"
        >
          <template #default="{ row }">
            <div class="booster-state">
              <el-tag
                round
                effect="light"
                :type="statusMeta[row.status as BoosterStatus].type"
              >
                {{ statusMeta[row.status as BoosterStatus].text }}
              </el-tag>
              <span class="booster-muted">提交：{{ formatDate(row.createdAt) }}</span>
              <span
                v-if="row.rejectReason"
                class="booster-muted"
              >
                驳回：{{ row.rejectReason }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="row.status === BoosterStatus.Pending">
              <el-button
                v-permission="PERMS.booster.review"
                link
                type="success"
                :icon="Check"
                @click="approve(row)"
              >
                通过
              </el-button>
              <el-button
                v-permission="PERMS.booster.review"
                link
                type="danger"
                :icon="Close"
                @click="reject(row)"
              >
                驳回
              </el-button>
            </template>
            <el-button
              v-permission="PERMS.booster.update"
              link
              type="primary"
              :icon="EditPen"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.depositFen > 0"
              v-permission="PERMS.booster.depositRefund"
              link
              type="warning"
              :icon="RefreshLeft"
              @click="refundDeposit(row)"
            >
              退押金
            </el-button>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="booster-muted">共 {{ total }} 条申请</span>
        <el-pagination
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[...PAGE_SIZE_OPTIONS]"
          @size-change="changePageSize"
          @current-change="changePage"
        />
      </div>
    </app-panel>

    <el-drawer
      v-model="editVisible"
      title="编辑打手资料"
      size="520px"
      class="admin-drawer booster-edit-drawer"
      destroy-on-close
    >
      <el-form
        label-width="90px"
        @submit.prevent
      >
        <el-form-item label="游戏昵称">
          <el-input
            v-model="editForm.gameNickname"
            :maxlength="BOOSTER_LIMITS.gameNicknameMax"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="擅长游戏">
          <el-input
            v-model="editForm.gameName"
            :maxlength="BOOSTER_LIMITS.gameNameMax"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="段位/实力">
          <el-input
            v-model="editForm.rank"
            :maxlength="BOOSTER_LIMITS.rankMax"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="自我介绍">
          <el-input
            v-model="editForm.intro"
            type="textarea"
            :rows="4"
            :maxlength="BOOSTER_LIMITS.introMax"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="admin-drawer__footer">
          <el-button @click="editVisible = false">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="editSaving"
            @click="saveEdit"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-drawer>

    <booster-level-dialog v-model="levelDialogVisible" />
    <booster-deposit-policy-dialog v-model="depositPolicyVisible" />
  </section>
</template>
