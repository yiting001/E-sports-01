<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  ProductStatus,
  type CategoryView,
  type ProductView,
  type ServiceAgentOption,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import ProductDirectory from '@/components/commerce/product/ProductDirectory.vue';
import ProductFormDrawer from '@/components/commerce/product/ProductFormDrawer.vue';
import ProductStats from '@/components/commerce/product/ProductStats.vue';
import type {
  ProductFilterModel,
  ProductFormModel,
} from '@/components/commerce/commerce-ui.types';
import { commerceApi } from '@/api/commerce.api';
import './CommerceView.css';
import './CommerceView.responsive.css';

const list = ref<ProductView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const categories = ref<CategoryView[]>([]);
const filter = reactive<ProductFilterModel>({
  categoryId: undefined,
  status: undefined,
  keyword: '',
});

const statusOptions = [
  { label: '全部', value: undefined },
  { label: '已上架', value: ProductStatus.OnShelf },
  { label: '已下架', value: ProductStatus.OffShelf },
];

const drawerVisible = ref(false);
const editingId = ref('');
const form = reactive<ProductFormModel>(emptyForm());

const agentOptions = ref<ServiceAgentOption[]>([]);
const agentLoading = ref(false);

const onShelfCount = computed(
  () => list.value.filter((item) => item.status === ProductStatus.OnShelf).length,
);
const linkedAgentCount = computed(() =>
  list.value.filter((item) => Boolean(item.serviceAgentId)).length,
);
const soldCount = computed(() => list.value.reduce((sum, item) => sum + item.sold, 0));

function emptyForm(): ProductFormModel {
  return {
    categoryId: '',
    title: '',
    cover: '',
    coverTitle: '',
    coverSub: '',
    description: '',
    priceYuan: 0,
    originPriceYuan: 0,
    serviceAgentId: '',
    sort: 0,
  };
}

function yuan(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

function toFen(value: number): number {
  return Math.round(value * 100);
}

async function loadCategories(): Promise<void> {
  const res = await commerceApi.listCategories(1, PAGINATION_DEFAULTS.maxPageSize);
  categories.value = res.list;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await commerceApi.listProducts({
      page: page.value,
      pageSize: pageSize.value,
      categoryId: filter.categoryId,
      status: filter.status,
      keyword: filter.keyword.trim() || undefined,
    });
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function search(): Promise<void> {
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function resetSearch(): Promise<void> {
  Object.assign(filter, { categoryId: undefined, status: undefined, keyword: '' });
  await search();
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

async function searchAgents(keyword: string): Promise<void> {
  agentLoading.value = true;
  try {
    const res = await commerceApi.listServiceAgents(1, 20, keyword || undefined);
    agentOptions.value = res.list;
  } finally {
    agentLoading.value = false;
  }
}

function updateFilter(value: ProductFilterModel): void {
  Object.assign(filter, value);
}

function updateForm(value: ProductFormModel): void {
  Object.assign(form, value);
}

function openCreate(): void {
  editingId.value = '';
  Object.assign(form, emptyForm());
  agentOptions.value = [];
  drawerVisible.value = true;
}

function openEdit(row: ProductView): void {
  editingId.value = row.id;
  Object.assign(form, {
    categoryId: row.categoryId,
    title: row.title,
    cover: row.cover,
    coverTitle: row.coverTitle,
    coverSub: row.coverSub,
    description: row.description,
    priceYuan: row.priceFen / 100,
    originPriceYuan: row.originPriceFen / 100,
    serviceAgentId: row.serviceAgentId,
    sort: row.sort,
  });
  agentOptions.value =
    row.serviceAgentId && row.serviceAgentName
      ? [{ id: row.serviceAgentId, username: row.serviceAgentName, nickname: row.serviceAgentName }]
      : [];
  drawerVisible.value = true;
}

async function submit(): Promise<void> {
  if (!form.categoryId) {
    ElMessage.warning('请选择分类');
    return;
  }
  if (!form.title.trim() || !form.coverTitle.trim()) {
    ElMessage.warning('商品名与封面主标语必填');
    return;
  }
  const payload = {
    categoryId: form.categoryId,
    title: form.title.trim(),
    cover: form.cover.trim(),
    coverTitle: form.coverTitle.trim(),
    coverSub: form.coverSub.trim(),
    description: form.description,
    priceFen: toFen(form.priceYuan),
    originPriceFen: toFen(form.originPriceYuan),
    serviceAgentId: form.serviceAgentId || '',
    sort: form.sort,
  };
  if (editingId.value) {
    await commerceApi.updateProduct(editingId.value, payload);
    ElMessage.success('已保存');
  } else {
    await commerceApi.createProduct(payload);
    ElMessage.success('创建成功，默认下架，请在列表中上架');
  }
  drawerVisible.value = false;
  await load();
}

async function togglePublish(row: ProductView): Promise<void> {
  const next =
    row.status === ProductStatus.OnShelf ? ProductStatus.OffShelf : ProductStatus.OnShelf;
  await commerceApi.publishProduct(row.id, { status: next });
  ElMessage.success(next === ProductStatus.OnShelf ? '已上架' : '已下架');
  await load();
}

async function remove(row: ProductView): Promise<void> {
  await ElMessageBox.confirm(`确认删除商品「${row.title}」？`, '提示', { type: 'warning' });
  await commerceApi.removeProduct(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(async () => {
  await loadCategories();
  await load();
});
</script>

<template>
  <section class="admin-page commerce-page product-page">
    <product-stats
      :total="total"
      :on-shelf-count="onShelfCount"
      :linked-agent-count="linkedAgentCount"
      :sold-count="soldCount"
    />
    <product-directory
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :categories="categories"
      :filter="filter"
      :status-options="statusOptions"
      :yuan="yuan"
      @update:filter="updateFilter"
      @search="search"
      @reset="resetSearch"
      @refresh="load"
      @create="openCreate"
      @edit="openEdit"
      @publish="togglePublish"
      @remove="remove"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
    <product-form-drawer
      v-model="drawerVisible"
      :form="form"
      :is-edit="Boolean(editingId)"
      :categories="categories"
      :agent-options="agentOptions"
      :agent-loading="agentLoading"
      @update:form="updateForm"
      @search-agents="searchAgents"
      @submit="submit"
    />
  </section>
</template>
