<script setup lang="ts">
import type { ListLogsQuery, LogView, TraceDetailView } from '@app/contracts';
import { LogLevel, LogType, PAGINATION_DEFAULTS, PERMS } from '@app/contracts';
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { observabilityApi } from '@/api/observability.api';

/** 级别 → 标签颜色，统一视觉语义 */
const LEVEL_TAG: Record<LogLevel, string> = {
  [LogLevel.Debug]: 'info',
  [LogLevel.Info]: 'success',
  [LogLevel.Warn]: 'warning',
  [LogLevel.Error]: 'danger',
};

const list = ref<LogView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

/** 多条件筛选表单（空值不参与查询） */
const filter = reactive<Omit<ListLogsQuery, 'page' | 'pageSize'>>({
  level: undefined,
  type: undefined,
  traceId: '',
  path: '',
  userId: '',
});

const levelOptions = Object.values(LogLevel);
const typeOptions = Object.values(LogType);

function buildQuery(): ListLogsQuery {
  return {
    page: page.value,
    pageSize: pageSize.value,
    level: filter.level || undefined,
    type: filter.type || undefined,
    traceId: filter.traceId || undefined,
    path: filter.path || undefined,
    userId: filter.userId || undefined,
  };
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await observabilityApi.list(buildQuery());
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function search(): void {
  page.value = PAGINATION_DEFAULTS.page;
  void load();
}

function reset(): void {
  filter.level = undefined;
  filter.type = undefined;
  filter.traceId = '';
  filter.path = '';
  filter.userId = '';
  search();
}

/** ===== 链路详情抽屉 ===== */
const drawerVisible = ref(false);
const detail = ref<TraceDetailView | null>(null);
const detailLoading = ref(false);

async function openTrace(traceId: string): Promise<void> {
  if (!traceId || traceId === '-') {
    return;
  }
  drawerVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    detail.value = await observabilityApi.traceDetail(traceId);
  } finally {
    detailLoading.value = false;
  }
}

/** ===== 按保留天数清理 ===== */
async function purge(): Promise<void> {
  const { value } = await ElMessageBox.prompt(
    '输入要保留的天数（早于该天数的日志将被删除，留空则按配置中心 retentionDays）',
    '清理日志',
    { inputPattern: /^\d*$/, inputErrorMessage: '请输入非负整数' },
  );
  const days = value ? Number(value) : undefined;
  const res = await observabilityApi.purge({ days });
  ElMessage.success(`已清理 ${res.deleted} 条（保留 ${res.retentionDays} 天）`);
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <el-form
      class="filters"
      :inline="true"
    >
      <el-form-item label="级别">
        <el-select
          v-model="filter.level"
          clearable
          placeholder="全部"
          style="width: 120px"
        >
          <el-option
            v-for="lv in levelOptions"
            :key="lv"
            :label="lv"
            :value="lv"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-select
          v-model="filter.type"
          clearable
          placeholder="全部"
          style="width: 120px"
        >
          <el-option
            v-for="t in typeOptions"
            :key="t"
            :label="t"
            :value="t"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="TraceId">
        <el-input
          v-model="filter.traceId"
          clearable
          placeholder="链路 ID"
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item label="路径">
        <el-input
          v-model="filter.path"
          clearable
          placeholder="包含匹配"
          style="width: 180px"
        />
      </el-form-item>
      <el-form-item label="用户ID">
        <el-input
          v-model="filter.userId"
          clearable
          style="width: 160px"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="search"
        >
          查询
        </el-button>
        <el-button @click="reset">
          重置
        </el-button>
        <el-button
          v-permission="PERMS.log.purge"
          type="danger"
          @click="purge"
        >
          清理
        </el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="list"
      border
      size="small"
    >
      <el-table-column
        prop="createdAt"
        label="时间"
        width="200"
      />
      <el-table-column
        label="级别"
        width="80"
      >
        <template #default="{ row }">
          <el-tag :type="LEVEL_TAG[row.level as LogLevel]">
            {{ row.level }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="type"
        label="类型"
        width="80"
      />
      <el-table-column
        prop="method"
        label="方法"
        width="70"
      />
      <el-table-column
        prop="path"
        label="路径"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="statusCode"
        label="状态"
        width="70"
      />
      <el-table-column
        prop="durationMs"
        label="耗时(ms)"
        width="90"
      />
      <el-table-column
        prop="username"
        label="用户"
        width="100"
      />
      <el-table-column
        label="TraceId"
        min-width="160"
      >
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.log.detail"
            link
            type="primary"
            @click="openTrace(row.traceId)"
          >
            {{ row.traceId }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      @current-change="(p: number) => { page = p; load(); }"
    />

    <el-drawer
      v-model="drawerVisible"
      title="链路详情"
      size="50%"
    >
      <div
        v-if="detail"
        class="trace-head"
      >
        <p>TraceId：{{ detail.traceId }}</p>
        <p>共 {{ detail.total }} 条 span</p>
      </div>
      <el-timeline v-loading="detailLoading">
        <el-timeline-item
          v-for="log in detail?.logs ?? []"
          :key="log.id"
          :timestamp="log.createdAt"
          :type="LEVEL_TAG[log.level as LogLevel]"
        >
          <p class="span-line">
            <el-tag
              :type="LEVEL_TAG[log.level as LogLevel]"
              size="small"
            >
              {{ log.level }}
            </el-tag>
            <span class="ctx">[{{ log.context }}]</span>
            {{ log.message }}
          </p>
          <pre
            v-if="log.stack"
            class="stack"
          >{{ log.stack }}</pre>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </div>
</template>

<style scoped>
.filters {
  margin-bottom: 12px;
}
.pager {
  margin-top: 12px;
}
.trace-head {
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
.span-line {
  margin: 0;
}
.ctx {
  margin: 0 6px;
  color: #909399;
}
.stack {
  margin-top: 6px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
