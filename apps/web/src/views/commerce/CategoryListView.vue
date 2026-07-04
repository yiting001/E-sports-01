<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { PAGINATION_DEFAULTS, type CategoryView } from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { commerceApi } from '@/api/commerce.api';

const list = ref<CategoryView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const dialogVisible = ref(false);
const editingId = ref<string>('');
const form = reactive({ name: '', cover: '', icon: '', sort: 0, enabled: true });

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
    const res = await commerceApi.listCategories(page.value, pageSize.value);
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
  Object.assign(form, { name: '', cover: '', icon: '', sort: 0, enabled: true });
  dialogVisible.value = true;
}

function openEdit(row: CategoryView): void {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    cover: row.cover,
    icon: row.icon,
    sort: row.sort,
    enabled: row.enabled,
  });
  dialogVisible.value = true;
}

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('分类名必填');
    return;
  }
  const payload = {
    name: form.name.trim(),
    cover: form.cover.trim(),
    icon: form.icon,
    sort: form.sort,
    enabled: form.enabled,
  };
  if (editingId.value) {
    await commerceApi.updateCategory(editingId.value, payload);
    ElMessage.success('已保存');
  } else {
    await commerceApi.createCategory(payload);
    ElMessage.success('创建成功');
  }
  dialogVisible.value = false;
  await load();
}

async function remove(row: CategoryView): Promise<void> {
  await ElMessageBox.confirm(`确认删除分类「${row.name}」？`, '提示', {
    type: 'warning',
  });
  await commerceApi.removeCategory(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="page-toolbar">
      <h2 class="page-title">
        分类管理
      </h2>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新增分类
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="图标"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          <el-image
            v-if="row.icon"
            :src="row.icon"
            :preview-src-list="[row.icon]"
            preview-teleported
            fit="cover"
            class="icon-thumb"
          />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="name"
        label="分类名"
        min-width="140"
      />
      <el-table-column
        prop="cover"
        label="文字图标"
        min-width="140"
      />
      <el-table-column
        prop="sort"
        label="排序"
        width="90"
        align="center"
      />
      <el-table-column
        prop="productCount"
        label="商品数"
        width="90"
        align="center"
      />
      <el-table-column
        label="状态"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        min-width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="remove(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="page-pagination">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="changePage"
        @size-change="changePageSize"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑分类' : '新增分类'"
      width="460px"
    >
      <el-form label-width="88px">
        <el-form-item
          label="分类名"
          required
        >
          <el-input
            v-model="form.name"
            maxlength="64"
            placeholder="如：大红单"
          />
        </el-form-item>
        <el-form-item label="图标图片">
          <ImageUploader v-model="form.icon" />
          <span class="form-hint">设置后 C 端分类以图片展示；留空则用下方文字图标</span>
        </el-form-item>
        <el-form-item label="文字图标">
          <el-input
            v-model="form.cover"
            maxlength="64"
            placeholder="无图标图片时以此文字展示（留空则用分类名）"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sort"
            :min="0"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="submit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.page-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.icon-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
}
.form-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
