<script setup lang="ts">
import type { ListLogsQuery, LogView, TraceDetailView } from '@app/contracts';
import { LogLevel, LogType, PAGINATION_DEFAULTS, PERMS } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Clock, Delete, Link, Monitor, Refresh, Search } from '@element-plus/icons-vue';
import { observabilityApi } from '@/api/observability.api';
import AppDataTable from '@/components/common/AppDataTable.vue';
import './LogView.css';
import './LogView.drawer.css';
import './LogView.responsive.css';

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface LogMeta {
  label: string;
  tag: TagType;
  tone: string;
}

const LEVEL_META: Record<LogLevel, LogMeta> = {
  [LogLevel.Debug]: { label: '调试', tag: 'info', tone: 'debug' },
  [LogLevel.Info]: { label: '信息', tag: 'success', tone: 'info' },
  [LogLevel.Warn]: { label: '警告', tag: 'warning', tone: 'warn' },
  [LogLevel.Error]: { label: '错误', tag: 'danger', tone: 'error' },
};

const TYPE_META: Record<LogType, LogMeta> = {
  [LogType.Access]: { label: '访问', tag: 'primary', tone: 'access' },
  [LogType.Error]: { label: '异常', tag: 'danger', tone: 'error' },
  [LogType.App]: { label: '应用', tag: 'success', tone: 'app' },
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
const errorCount = computed(() => list.value.filter((item) => item.level === LogLevel.Error).length);
const warnCount = computed(() => list.value.filter((item) => item.level === LogLevel.Warn).length);
const accessCount = computed(() => list.value.filter((item) => item.type === LogType.Access).length);
const averageDuration = computed(() => {
  const durations = list.value
    .map((item) => item.durationMs)
    .filter((value): value is number => typeof value === 'number');
  if (durations.length === 0) {
    return null;
  }
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
});

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

async function changePage(value: number): Promise<void> {
  page.value = value;
  await load();
}

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
    second: '2-digit',
  }).format(new Date(value));
}

function formatDuration(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '-';
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }
  return `${value}ms`;
}

function statusTone(statusCode: number | null): string {
  if (!statusCode) {
    return 'empty';
  }
  if (statusCode >= 500) {
    return 'danger';
  }
  if (statusCode >= 400) {
    return 'warning';
  }
  return 'success';
}

function formatDetail(detailText: string): string {
  try {
    return JSON.stringify(JSON.parse(detailText), null, 2);
  } catch {
    return detailText;
  }
}

onMounted(load);
</script>

<template>
  <section class="log-page">
    <header class="log-hero">
      <div class="log-hero__content">
        <span class="log-eyebrow">Observability</span>
        <h1>日志管理</h1>
        <p>按级别、类型、链路与路径检索系统日志，快速还原请求上下文与异常现场。</p>
      </div>
      <div
        class="log-hero__visual"
        aria-hidden="true"
      >
        <div class="log-radar">
          <span class="log-radar__ring ring-a" />
          <span class="log-radar__ring ring-b" />
          <span class="log-radar__line line-a" />
          <span class="log-radar__line line-b" />
          <span class="log-core">
            <el-icon><Monitor /></el-icon>
          </span>
          <span class="log-pulse pulse-a" />
          <span class="log-pulse pulse-b" />
          <span class="log-pulse pulse-c" />
        </div>
      </div>
    </header>

    <section class="log-stats">
      <article class="log-stat">
        <span>日志总数</span>
        <strong>{{ total }}</strong>
        <small>当前筛选结果</small>
      </article>
      <article class="log-stat">
        <span>异常日志</span>
        <strong>{{ errorCount }}</strong>
        <small>当前页错误数</small>
      </article>
      <article class="log-stat">
        <span>访问日志</span>
        <strong>{{ accessCount }}</strong>
        <small>当前页请求数</small>
      </article>
      <article class="log-stat">
        <span>平均耗时</span>
        <strong>{{ formatDuration(averageDuration) }}</strong>
        <small>{{ warnCount }} 条警告</small>
      </article>
    </section>

    <section class="log-panel">
      <div class="log-panel__head">
        <div>
          <span class="log-eyebrow">Directory</span>
          <h2>日志目录</h2>
        </div>
        <div class="log-panel__actions">
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
          <el-button
            v-permission="PERMS.log.purge"
            type="danger"
            :icon="Delete"
            @click="purge"
          >
            清理
          </el-button>
        </div>
      </div>

      <el-form class="log-filters">
        <el-form-item label="级别">
          <el-select
            v-model="filter.level"
            clearable
            placeholder="全部级别"
            class="log-filter-control"
          >
            <el-option
              v-for="level in levelOptions"
              :key="level"
              :label="LEVEL_META[level].label"
              :value="level"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="filter.type"
            clearable
            placeholder="全部类型"
            class="log-filter-control"
          >
            <el-option
              v-for="type in typeOptions"
              :key="type"
              :label="TYPE_META[type].label"
              :value="type"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="TraceId">
          <el-input
            v-model="filter.traceId"
            clearable
            placeholder="链路 ID"
            class="log-filter-control"
          />
        </el-form-item>
        <el-form-item label="路径">
          <el-input
            v-model="filter.path"
            clearable
            placeholder="包含匹配"
            class="log-filter-control"
          />
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input
            v-model="filter.userId"
            clearable
            placeholder="用户 ID"
            class="log-filter-control"
          />
        </el-form-item>
        <el-form-item class="log-filter-actions">
          <el-button
            type="primary"
            :icon="Search"
            @click="search"
          >
            查询
          </el-button>
          <el-button
            :icon="Refresh"
            @click="reset"
          >
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="1380"
        table-class="log-table"
        empty-text="暂无日志"
      >
        <el-table-column
          label="时间"
          width="170"
        >
          <template #default="{ row }">
            <span class="log-time">
              <el-icon><Clock /></el-icon>
              {{ formatDate(row.createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="级别"
          width="96"
        >
          <template #default="{ row }">
            <span :class="['log-level', `is-${LEVEL_META[row.level as LogLevel].tone}`]">
              {{ LEVEL_META[row.level as LogLevel].label }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="类型"
          width="96"
        >
          <template #default="{ row }">
            <span :class="['log-type', `is-${TYPE_META[row.type as LogType].tone}`]">
              {{ TYPE_META[row.type as LogType].label }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="请求"
          min-width="280"
        >
          <template #default="{ row }">
            <div class="log-request">
              <span class="log-method">{{ row.method || '-' }}</span>
              <strong>{{ row.path || '-' }}</strong>
              <small :class="['log-status', `is-${statusTone(row.statusCode)}`]">
                {{ row.statusCode || '无状态' }}
              </small>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="耗时"
          width="110"
        >
          <template #default="{ row }">
            <span class="log-duration">{{ formatDuration(row.durationMs) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="用户"
          width="140"
        >
          <template #default="{ row }">
            <div class="log-user">
              <strong>{{ row.username || '匿名' }}</strong>
              <small>{{ row.userId || row.ip || '-' }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="TraceId"
          min-width="220"
        >
          <template #default="{ row }">
            <el-button
              v-permission="PERMS.log.detail"
              link
              type="primary"
              class="log-trace"
              @click="openTrace(row.traceId)"
            >
              <el-icon><Link /></el-icon>
              <span>{{ row.traceId || '-' }}</span>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column
          label="消息"
          min-width="268"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="log-message">
              <strong>{{ row.context || '-' }}</strong>
              <small>{{ row.message || '-' }}</small>
            </div>
          </template>
        </el-table-column>
      </app-data-table>

      <el-pagination
        class="log-pager"
        layout="total, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="changePage"
      />
    </section>

    <el-drawer
      v-model="drawerVisible"
      title="链路详情"
      size="52%"
      class="log-drawer"
    >
      <section
        v-if="detail"
        class="log-trace-head"
      >
        <div>
          <span>TraceId</span>
          <strong>{{ detail.traceId }}</strong>
        </div>
        <div>
          <span>Span 数</span>
          <strong>{{ detail.total }}</strong>
        </div>
      </section>
      <el-timeline
        v-loading="detailLoading"
        class="log-timeline"
      >
        <el-timeline-item
          v-for="log in detail?.logs ?? []"
          :key="log.id"
          :timestamp="formatDate(log.createdAt)"
          :type="LEVEL_META[log.level as LogLevel].tag"
        >
          <div class="log-span-card">
            <div class="log-span-card__head">
              <span :class="['log-level', `is-${LEVEL_META[log.level as LogLevel].tone}`]">
                {{ LEVEL_META[log.level as LogLevel].label }}
              </span>
              <strong>[{{ log.context }}]</strong>
            </div>
            <p>{{ log.message }}</p>
            <small>{{ log.method || '-' }} {{ log.path || '-' }} · {{ formatDuration(log.durationMs) }}</small>
            <div
              v-if="log.detail"
              class="log-detail-block"
            >
              <span>错误详情（响应体 / 请求体）</span>
              <pre>{{ formatDetail(log.detail) }}</pre>
            </div>
            <pre
              v-if="log.stack"
              class="log-stack"
            >{{ log.stack }}</pre>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </section>
</template>
