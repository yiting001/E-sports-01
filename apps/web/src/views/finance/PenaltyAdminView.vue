<script setup lang="ts">
/**
 * 罚款管理页（菜单 finance:penalty:menu，财务分组）。
 * 分页展示对打手的罚款记录（金额/来源/理由/关联订单/操作时间），
 * 支持创建罚款（finance:penalty:create）：从钱包余额或已缴押金中扣除。
 */
import { onMounted, reactive, ref } from 'vue';
import {
  FEN_PER_YUAN,
  PAGINATION_DEFAULTS,
  PENALTY_LIMITS,
  PENALTY_SOURCE_TEXT,
  PERMS,
  PenaltySource,
  type PenaltyView,
} from '@app/contracts';
import { ElMessage } from 'element-plus';
import { Plus, Refresh, Warning } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { financeApi } from '@/api/finance.api';
import './PenaltyAdminView.css';

const list = ref<PenaltyView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const sourceOptions = Object.values(PenaltySource).map((source) => ({
  label: PENALTY_SOURCE_TEXT[source],
  value: source,
}));

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
    const res = await financeApi.listPenalties({
      page: page.value,
      pageSize: pageSize.value,
    });
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

const createVisible = ref(false);
const creating = ref(false);
const createForm = reactive({
  boosterUserId: '',
  amountYuan: 0,
  source: PenaltySource.Balance,
  reason: '',
  orderNo: '',
});

function openCreate(): void {
  createForm.boosterUserId = '';
  createForm.amountYuan = 0;
  createForm.source = PenaltySource.Balance;
  createForm.reason = '';
  createForm.orderNo = '';
  createVisible.value = true;
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
    createVisible.value = false;
    await load();
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page penalty-page">
    <app-panel
      title="打手罚款管理"
      eyebrow="Booster Penalty"
    >
      <template #actions>
        <div class="admin-actions">
          <el-button
            v-permission="PERMS.finance.penaltyCreate"
            type="primary"
            :icon="Plus"
            @click="openCreate"
          >
            创建罚款
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
        :min-width="1080"
        table-class="penalty-table"
        empty-text="暂无罚款记录"
      >
        <el-table-column
          label="被罚打手"
          min-width="170"
        >
          <template #default="{ row }">
            <div class="penalty-user">
              <span class="penalty-user__avatar">
                <el-icon><Warning /></el-icon>
              </span>
              <div>
                <strong>{{ row.nickname || row.username }}</strong>
                <small>{{ row.username }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="罚款金额"
          width="110"
        >
          <template #default="{ row }">
            <span class="penalty-amount">¥{{ row.amountYuan }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="扣除来源"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              round
              effect="light"
              :type="row.source === PenaltySource.Deposit ? 'warning' : 'danger'"
            >
              {{ PENALTY_SOURCE_TEXT[row.source as PenaltySource] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="关联订单号"
          min-width="170"
        >
          <template #default="{ row }">
            <span class="penalty-muted">{{ row.orderNo || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="罚款理由"
          min-width="220"
        >
          <template #default="{ row }">
            <span class="penalty-muted">{{ row.reason }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作时间"
          width="150"
        >
          <template #default="{ row }">
            <span class="penalty-muted">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="penalty-muted">共 {{ total }} 条罚款记录</span>
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

    <el-dialog
      v-model="createVisible"
      title="创建罚款"
      width="520px"
    >
      <el-form
        label-width="110px"
        @submit.prevent
      >
        <el-form-item label="打手用户 ID">
          <el-input
            v-model="createForm.boosterUserId"
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
          <el-radio-group v-model="createForm.source">
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
        <el-button @click="createVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="creating"
          @click="submitCreate"
        >
          确认罚款
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
