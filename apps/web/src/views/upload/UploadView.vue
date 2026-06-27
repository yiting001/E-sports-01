<script setup lang="ts">
import type { UploadedFileView } from '@app/contracts';
import { PERMS, StorageDriver } from '@app/contracts';
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Clock, Delete, Document, FolderOpened, Link, Refresh, UploadFilled } from '@element-plus/icons-vue';
import { uploadApi } from '@/api/upload.api';
import AppDataTable from '@/components/common/AppDataTable.vue';
import './UploadView.css';
import './UploadView.responsive.css';

const list = ref<UploadedFileView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const localCount = computed(
  () => list.value.filter((item) => item.driver === StorageDriver.Local).length,
);
const ossCount = computed(
  () => list.value.filter((item) => item.driver === StorageDriver.Oss).length,
);
const pageTotalSize = computed(() => list.value.reduce((sum, item) => sum + item.size, 0));

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

onMounted(load);
</script>

<template>
  <section class="upload-page">
    <header class="upload-hero">
      <div class="upload-hero__content">
        <span class="upload-eyebrow">Asset Hub</span>
        <h1>文件上传</h1>
        <p>统一查看上传文件、存储驱动、访问地址与占用空间，删除操作会同步清理存储对象和文件记录。</p>
      </div>
      <div
        class="upload-hero__visual"
        aria-hidden="true"
      >
        <div class="upload-flow">
          <span class="upload-flow__line flow-line-a" />
          <span class="upload-flow__line flow-line-b" />
          <span class="upload-flow__line flow-line-c" />
          <span class="upload-core">
            <el-icon><UploadFilled /></el-icon>
          </span>
          <span class="upload-node upload-node-a">
            <el-icon><Document /></el-icon>
          </span>
          <span class="upload-node upload-node-b">
            <el-icon><FolderOpened /></el-icon>
          </span>
          <span class="upload-node upload-node-c">
            <el-icon><Link /></el-icon>
          </span>
        </div>
      </div>
    </header>

    <section class="upload-stats">
      <article class="upload-stat">
        <span>文件总数</span>
        <strong>{{ total }}</strong>
        <small>分页记录总量</small>
      </article>
      <article class="upload-stat">
        <span>本地存储</span>
        <strong>{{ localCount }}</strong>
        <small>当前页文件</small>
      </article>
      <article class="upload-stat">
        <span>OSS 存储</span>
        <strong>{{ ossCount }}</strong>
        <small>当前页文件</small>
      </article>
      <article class="upload-stat">
        <span>本页容量</span>
        <strong>{{ formatSize(pageTotalSize) }}</strong>
        <small>按当前分页统计</small>
      </article>
    </section>

    <section class="upload-panel">
      <div class="upload-panel__head">
        <div>
          <span class="upload-eyebrow">Directory</span>
          <h2>上传目录</h2>
        </div>
        <div class="upload-panel__actions">
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
      </div>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="1140"
        table-class="upload-table"
        empty-text="暂无上传文件"
      >
        <el-table-column
          label="文件"
          min-width="260"
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
          width="110"
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
          width="130"
        >
          <template #default="{ row }">
            <span class="upload-type">{{ shortMimeType(row.mimeType) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="大小"
          width="120"
        >
          <template #default="{ row }">
            <span class="upload-size">{{ formatSize(row.size) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="访问地址"
          min-width="240"
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
          width="170"
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
          width="110"
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

      <el-pagination
        class="upload-pager"
        layout="total, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(value: number) => { page = value; load(); }"
      />
    </section>
  </section>
</template>
