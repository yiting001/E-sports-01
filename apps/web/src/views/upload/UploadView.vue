<script setup lang="ts">
import type { UploadedFileView } from '@app/contracts';
import { PAGINATION_DEFAULTS, PERMS, StorageDriver } from '@app/contracts';
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Clock, Delete, Document, FolderOpened, Link, Refresh, UploadFilled } from '@element-plus/icons-vue';
import { uploadApi } from '@/api/upload.api';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import AppStats from '@/components/common/AppStats.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import './UploadView.css';
import './UploadView.responsive.css';

const list = ref<UploadedFileView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const localCount = computed(
  () => list.value.filter((item) => item.driver === StorageDriver.Local).length,
);
const ossCount = computed(
  () => list.value.filter((item) => item.driver === StorageDriver.Oss).length,
);
const pageTotalSize = computed(() => list.value.reduce((sum, item) => sum + item.size, 0));
const statItems = computed(() => [
  { label: '文件总数', value: total.value, helper: '分页记录总量' },
  { label: '本地存储', value: localCount.value, helper: '当前页文件' },
  { label: 'OSS 存储', value: ossCount.value, helper: '当前页文件' },
  { label: '本页容量', value: formatSize(pageTotalSize.value), helper: '按当前分页统计' },
]);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await uploadApi.list(page.value, pageSize.value);
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function pick(): void {
  fileInput.value?.click();
}

function driverLabel(driver: StorageDriver): string {
  return driver === StorageDriver.Oss ? 'OSS' : '本地';
}

function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[index]}`;
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
  }).format(new Date(value));
}

function shortMimeType(mimeType: string): string {
  if (!mimeType) {
    return 'unknown';
  }
  return mimeType.split('/').pop() || mimeType;
}

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }
  try {
    await uploadApi.upload(file);
    ElMessage.success('上传成功');
    await load();
  } catch {
    // 错误提示由全局 http 拦截器统一弹出
  } finally {
    target.value = '';
  }
}

async function remove(row: UploadedFileView): Promise<void> {
  await ElMessageBox.confirm(`确认删除文件 ${row.filename}？`, '提示', { type: 'warning' });
  await uploadApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
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

onMounted(load);
</script>

<template>
  <section class="admin-page upload-page">
    <app-stats :items="statItems" />

    <app-panel
      title="上传目录"
      eyebrow="Directory"
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
            v-permission="PERMS.file.upload"
            type="primary"
            :icon="UploadFilled"
            @click="pick"
          >
            上传文件
          </el-button>
          <input
            ref="fileInput"
            type="file"
            class="hidden-input"
            @change="onFileChange"
          >
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="900"
        table-class="upload-table"
        empty-text="暂无上传文件"
      >
        <el-table-column
          label="文件"
          min-width="240"
        >
          <template #default="{ row }">
            <div class="upload-file">
              <span class="upload-file__icon">
                <el-icon><Document /></el-icon>
              </span>
              <div>
                <strong>{{ row.filename }}</strong>
                <small>{{ row.key }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="存储"
          width="96"
        >
          <template #default="{ row }">
            <span :class="['upload-driver', row.driver === StorageDriver.Oss ? 'is-oss' : '']">
              <el-icon><FolderOpened /></el-icon>
              {{ driverLabel(row.driver) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="类型"
          width="96"
        >
          <template #default="{ row }">
            <span class="upload-type">{{ shortMimeType(row.mimeType) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="大小"
          width="96"
        >
          <template #default="{ row }">
            <span class="upload-size">{{ formatSize(row.size) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="访问地址"
          min-width="150"
        >
          <template #default="{ row }">
            <el-link
              :href="row.url"
              target="_blank"
              type="primary"
              class="upload-link"
            >
              <el-icon><Link /></el-icon>
              <span>{{ row.url }}</span>
            </el-link>
          </template>
        </el-table-column>
        <el-table-column
          label="上传时间"
          width="144"
        >
          <template #default="{ row }">
            <span class="upload-date">
              <el-icon><Clock /></el-icon>
              {{ formatDate(row.createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="86"
        >
          <template #default="{ row }">
            <div class="upload-actions">
              <el-button
                v-permission="PERMS.file.remove"
                type="danger"
                link
                :icon="Delete"
                @click="remove(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="upload-pager__summary">共 {{ total }} 个文件</span>
        <el-pagination
          class="upload-pagination"
          layout="sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[...PAGE_SIZE_OPTIONS]"
          @size-change="changePageSize"
          @current-change="changePage"
        />
      </div>
    </app-panel>
  </section>
</template>
