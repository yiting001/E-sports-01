<script setup lang="ts">
import type { UploadedFileView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { uploadApi } from '@/api/upload.api';

const list = ref<UploadedFileView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

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
  <div>
    <div class="toolbar">
      <el-button
        v-permission="PERMS.file.upload"
        type="primary"
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
    <el-table
      v-loading="loading"
      :data="list"
      border
    >
      <el-table-column
        prop="filename"
        label="文件名"
      />
      <el-table-column
        prop="driver"
        label="存储"
        width="100"
      />
      <el-table-column
        prop="size"
        label="大小(字节)"
        width="120"
      />
      <el-table-column label="访问">
        <template #default="{ row }">
          <el-link
            :href="row.url"
            target="_blank"
            type="primary"
          >
            {{ row.url }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
      >
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.file.remove"
            type="danger"
            link
            @click="remove(row)"
          >
            删除
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
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
}
.hidden-input {
  display: none;
}
.pager {
  margin-top: 12px;
}
</style>
