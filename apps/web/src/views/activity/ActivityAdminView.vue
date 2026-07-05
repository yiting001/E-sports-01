<script setup lang="ts">
/**
 * 福利活动管理页：活动 CRUD。
 * 管理端发布运营活动（封面/富文本/起止时间），
 * C 端「福利活动」入口浏览进行中的活动列表与详情。
 */
import { onMounted, reactive, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  PERMS,
  type ActivityView,
  type UpsertActivityPayload,
} from '@app/contracts';
import { Delete, EditPen, Plus, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import ActivityFormDialog from '@/components/activity/ActivityFormDialog.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { activityApi } from '@/api/activity.api';

const list = ref<ActivityView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref('');
const form = reactive<UpsertActivityPayload>(emptyForm());

function emptyForm(): UpsertActivityPayload {
  return {
    title: '',
    cover: '',
    content: '',
    startAt: '',
    endAt: '',
    enabled: true,
    sort: 0,
  };
}

function formatDate(value: string): string {
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
    const res = await activityApi.list(page.value, pageSize.value);
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

function openCreate(): void {
  editingId.value = '';
  Object.assign(form, emptyForm());
  dialogVisible.value = true;
}

function openEdit(row: ActivityView): void {
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title,
    cover: row.cover,
    content: row.content,
    startAt: row.startAt,
    endAt: row.endAt,
    enabled: row.enabled,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

function updateForm(value: UpsertActivityPayload): void {
  Object.assign(form, value);
}

async function submit(): Promise<void> {
  if (!form.title.trim()) {
    ElMessage.warning('标题必填');
    return;
  }
  if (!form.startAt || !form.endAt) {
    ElMessage.warning('请选择活动时间');
    return;
  }
  submitting.value = true;
  try {
    const payload: UpsertActivityPayload = {
      ...form,
      title: form.title.trim(),
    };
    if (editingId.value) {
      await activityApi.update(editingId.value, payload);
      ElMessage.success('已保存');
    } else {
      await activityApi.create(payload);
      ElMessage.success('已发布');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

/** 行内启停切换：直接保存该行的启用状态 */
async function toggleEnabled(row: ActivityView, enabled: boolean): Promise<void> {
  await activityApi.update(row.id, {
    title: row.title,
    cover: row.cover,
    content: row.content,
    startAt: row.startAt,
    endAt: row.endAt,
    sort: row.sort,
    enabled,
  });
  ElMessage.success(enabled ? '已启用' : '已停用');
  await load();
}

async function remove(row: ActivityView): Promise<void> {
  await ElMessageBox.confirm(`确认删除活动「${row.title}」？`, '提示', {
    type: 'warning',
  });
  await activityApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <section class="admin-page activity-page">
    <app-panel
      title="福利活动"
      eyebrow="Activities"
      description="发布运营活动，C 端「福利活动」入口展示进行中的活动"
    >
      <template #actions>
        <div class="admin-actions">
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
          <el-button
            v-permission="PERMS.activity.save"
            type="primary"
            :icon="Plus"
            @click="openCreate"
          >
            发布活动
          </el-button>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="900"
        empty-text="暂无活动"
      >
        <el-table-column
          label="标题"
          min-width="220"
          prop="title"
        />
        <el-table-column
          label="活动时间"
          min-width="260"
        >
          <template #default="{ row }">
            <span class="activity-muted">
              {{ formatDate(row.startAt) }} ~ {{ formatDate(row.endAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="排序"
          width="80"
          prop="sort"
        />
        <el-table-column
          label="启用"
          width="90"
        >
          <template #default="{ row }">
            <el-switch
              v-permission="PERMS.activity.save"
              :model-value="row.enabled"
              @change="toggleEnabled(row, $event as boolean)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="150"
        >
          <template #default="{ row }">
            <el-button
              v-permission="PERMS.activity.save"
              link
              type="primary"
              :icon="EditPen"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.activity.remove"
              link
              type="danger"
              :icon="Delete"
              @click="remove(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="activity-muted">共 {{ total }} 个活动</span>
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

    <activity-form-dialog
      v-model="dialogVisible"
      :form="form"
      :is-edit="Boolean(editingId)"
      :submitting="submitting"
      @update:form="updateForm"
      @submit="submit"
    />
  </section>
</template>

<style scoped>
.activity-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
