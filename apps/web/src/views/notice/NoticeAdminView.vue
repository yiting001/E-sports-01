<script setup lang="ts">
/**
 * 运营通知管理页：首页横幅设置 + 通知公告 CRUD。
 * 通知在 C 端首页公告条滚动展示，点击进入详情；仅启用中的通知对 C 端可见。
 * 标记为弹窗公告的通知，会在 C 端首次进入时以弹窗展示最新一条。
 */
import { onMounted, reactive, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  PERMS,
  type NoticeView,
  type UpsertNoticePayload,
} from '@app/contracts';
import { Delete, EditPen, Plus, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import BannerPanel from '@/components/notice/BannerPanel.vue';
import NoticeFormDialog from '@/components/notice/NoticeFormDialog.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { noticeApi } from '@/api/notice.api';

const list = ref<NoticeView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref('');
const form = reactive<UpsertNoticePayload>(emptyForm());

function emptyForm(): UpsertNoticePayload {
  return { title: '', content: '', enabled: true, popup: false, sort: 0 };
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
    const res = await noticeApi.list(page.value, pageSize.value);
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

function openEdit(row: NoticeView): void {
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title,
    content: row.content,
    enabled: row.enabled,
    popup: row.popup,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

function updateForm(value: UpsertNoticePayload): void {
  Object.assign(form, value);
}

async function submit(): Promise<void> {
  if (!form.title.trim()) {
    ElMessage.warning('标题必填');
    return;
  }
  submitting.value = true;
  try {
    const payload: UpsertNoticePayload = { ...form, title: form.title.trim() };
    if (editingId.value) {
      await noticeApi.update(editingId.value, payload);
      ElMessage.success('已保存');
    } else {
      await noticeApi.create(payload);
      ElMessage.success('已发布');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

/** 行内启停切换：直接保存该行的启用状态 */
async function toggleEnabled(row: NoticeView, enabled: boolean): Promise<void> {
  await noticeApi.update(row.id, {
    title: row.title,
    content: row.content,
    sort: row.sort,
    popup: row.popup,
    enabled,
  });
  ElMessage.success(enabled ? '已启用' : '已停用');
  await load();
}

/** 行内弹窗公告切换：多条同时开启时 C 端只弹最新一条 */
async function togglePopup(row: NoticeView, popup: boolean): Promise<void> {
  await noticeApi.update(row.id, {
    title: row.title,
    content: row.content,
    sort: row.sort,
    enabled: row.enabled,
    popup,
  });
  ElMessage.success(popup ? '已设为弹窗公告' : '已取消弹窗公告');
  await load();
}

async function remove(row: NoticeView): Promise<void> {
  await ElMessageBox.confirm(`确认删除通知「${row.title}」？`, '提示', {
    type: 'warning',
  });
  await noticeApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <section class="admin-page notice-page">
    <banner-panel />

    <app-panel
      title="通知公告"
      eyebrow="Notices"
      description="C 端首页公告条滚动展示启用中的通知；开启「弹窗」的通知会在 C 端首次进入时弹出"
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
            v-permission="PERMS.notice.save"
            type="primary"
            :icon="Plus"
            @click="openCreate"
          >
            新建通知
          </el-button>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="860"
        empty-text="暂无通知"
      >
        <el-table-column
          label="标题"
          min-width="260"
          prop="title"
        />
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
              v-permission="PERMS.notice.save"
              :model-value="row.enabled"
              @change="toggleEnabled(row, $event as boolean)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="弹窗"
          width="90"
        >
          <template #default="{ row }">
            <el-switch
              v-permission="PERMS.notice.save"
              :model-value="row.popup"
              @change="togglePopup(row, $event as boolean)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="更新时间"
          width="160"
        >
          <template #default="{ row }">
            <span class="notice-muted">{{ formatDate(row.updatedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="150"
        >
          <template #default="{ row }">
            <el-button
              v-permission="PERMS.notice.save"
              link
              type="primary"
              :icon="EditPen"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.notice.remove"
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
        <span class="notice-muted">共 {{ total }} 条通知</span>
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

    <notice-form-dialog
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
.notice-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
