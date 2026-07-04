<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { PAGINATION_DEFAULTS, type CategoryView } from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import CategoryDirectory from '@/components/commerce/category/CategoryDirectory.vue';
import CategoryFormDrawer from '@/components/commerce/category/CategoryFormDrawer.vue';
import CategoryStats from '@/components/commerce/category/CategoryStats.vue';
import type { CategoryFormModel } from '@/components/commerce/commerce-ui.types';
import { commerceApi } from '@/api/commerce.api';
import './CommerceView.css';
import './CommerceView.responsive.css';

const list = ref<CategoryView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const drawerVisible = ref(false);
const editingId = ref('');
const form = reactive<CategoryFormModel>(emptyForm());

const enabledCount = computed(() => list.value.filter((item) => item.enabled).length);
const productCount = computed(() =>
  list.value.reduce((sum, item) => sum + item.productCount, 0),
);
const imageIconCount = computed(() => list.value.filter((item) => Boolean(item.icon)).length);

function emptyForm(): CategoryFormModel {
  return {
    name: '',
    cover: '',
    icon: '',
    sort: 0,
    enabled: true,
  };
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
  Object.assign(form, emptyForm());
  drawerVisible.value = true;
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
  drawerVisible.value = true;
}

function updateForm(value: CategoryFormModel): void {
  Object.assign(form, value);
}

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('分类名必填');
    return;
  }
  const payload = {
    name: form.name.trim(),
    cover: form.cover.trim(),
    icon: form.icon.trim(),
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
  drawerVisible.value = false;
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
  <section class="admin-page commerce-page category-page">
    <category-stats
      :total="total"
      :enabled-count="enabledCount"
      :product-count="productCount"
      :image-icon-count="imageIconCount"
    />
    <category-directory
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :format-date="formatDate"
      @refresh="load"
      @create="openCreate"
      @edit="openEdit"
      @remove="remove"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
    <category-form-drawer
      v-model="drawerVisible"
      :form="form"
      :is-edit="Boolean(editingId)"
      @update:form="updateForm"
      @submit="submit"
    />
  </section>
</template>
