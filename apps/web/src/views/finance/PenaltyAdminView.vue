<script setup lang="ts">
/**
 * 罚款管理页（菜单 finance:penalty:menu，财务分组）。
 * 分页展示对打手的罚款记录（金额/来源/理由/关联订单/操作时间），
 * 支持创建罚款（finance:penalty:create）：从钱包余额或已缴押金中扣除。
 */
import { onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  PENALTY_SOURCE_TEXT,
  PERMS,
  PenaltySource,
  type PenaltyView,
} from '@app/contracts';
import { Plus, Refresh, RefreshLeft, Search, Warning } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import PenaltyCreateDrawer from '@/components/finance/PenaltyCreateDrawer.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { financeApi } from '@/api/finance.api';
import './PenaltyAdminView.css';

type PenaltySourceTagType = 'warning' | 'danger';

const list = ref<PenaltyView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const boosterUserIdFilter = ref('');
const loading = ref(false);

const sourceTagType: Record<PenaltySource, PenaltySourceTagType> = {
  [PenaltySource.Balance]: 'danger',
  [PenaltySource.Deposit]: 'warning',
};

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

function sourceText(row: PenaltyView): string {
  return PENALTY_SOURCE_TEXT[row.source];
}

function sourceType(row: PenaltyView): PenaltySourceTagType {
  return sourceTagType[row.source];
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await financeApi.listPenalties({
      page: page.value,
      pageSize: pageSize.value,
      boosterUserId: boosterUserIdFilter.value.trim() || undefined,
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

async function search(): Promise<void> {
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function resetSearch(): Promise<void> {
  boosterUserIdFilter.value = '';
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

const createVisible = ref(false);

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page penalty-page">
    <app-panel
      title="打手罚款管理"
      eyebrow="Booster Penalty"
      description="记录并追踪对打手的余额或押金扣款，保留订单与理由供审计"
    >
      <template #actions>
        <div class="admin-actions">
          <el-button
            v-permission="PERMS.finance.penaltyCreate"
            type="primary"
            :icon="Plus"
            @click="createVisible = true"
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

      <template #toolbar>
        <div class="admin-toolbar">
          <el-input
            v-model="boosterUserIdFilter"
            class="penalty-filter"
            clearable
            placeholder="按打手用户 ID 查询"
            :prefix-icon="Search"
            @keyup.enter="search"
          />
          <div class="admin-actions">
            <el-button
              type="primary"
              :icon="Search"
              @click="search"
            >
              查询
            </el-button>
            <el-button
              :icon="RefreshLeft"
              @click="resetSearch"
            >
              重置
            </el-button>
          </div>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="920"
        table-class="penalty-table"
        empty-text="暂无罚款记录"
      >
        <el-table-column
          label="被罚打手"
          min-width="230"
        >
          <template #default="{ row }">
            <div class="penalty-user">
              <span class="penalty-user__avatar">
                <el-icon><Warning /></el-icon>
              </span>
              <div>
                <strong>{{ row.nickname || row.username }}</strong>
                <small>{{ row.username }}</small>
                <span>{{ row.boosterUserId }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="扣款信息"
          min-width="170"
        >
          <template #default="{ row }">
            <div class="penalty-money">
              <span class="penalty-amount">¥{{ row.amountYuan }}</span>
              <el-tag
                round
                effect="light"
                :type="sourceType(row)"
              >
                {{ sourceText(row) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="关联信息"
          min-width="280"
        >
          <template #default="{ row }">
            <div class="penalty-related">
              <span>订单：{{ row.orderNo || '-' }}</span>
              <span class="penalty-reason">{{ row.reason }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="操作信息"
          min-width="190"
        >
          <template #default="{ row }">
            <div class="penalty-operation">
              <span>{{ formatDate(row.createdAt) }}</span>
              <span class="penalty-muted">创建人：{{ row.createdBy }}</span>
            </div>
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

    <penalty-create-drawer
      v-model="createVisible"
      @saved="load"
    />
  </section>
</template>
