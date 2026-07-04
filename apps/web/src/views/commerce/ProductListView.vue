<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  ProductStatus,
  type CategoryView,
  type ProductView,
  type ServiceAgentOption,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import ImageUploader from '@/components/common/ImageUploader.vue';
import RichTextEditor from '@/components/common/RichTextEditor.vue';
import { commerceApi } from '@/api/commerce.api';

const list = ref<ProductView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const categories = ref<CategoryView[]>([]);
const filter = reactive<{ categoryId?: string; status?: ProductStatus; keyword: string }>({
  categoryId: undefined,
  status: undefined,
  keyword: '',
});

const statusOptions = [
  { label: '全部', value: undefined },
  { label: '已上架', value: ProductStatus.OnShelf },
  { label: '已下架', value: ProductStatus.OffShelf },
];

const dialogVisible = ref(false);
const editingId = ref<string>('');
const form = reactive({
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
});

const agentOptions = ref<ServiceAgentOption[]>([]);
const agentLoading = ref(false);

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
      keyword: filter.keyword || undefined,
    });
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function search(): Promise<void> {
  page.value = 1;
  await load();
}

async function resetSearch(): Promise<void> {
  filter.categoryId = undefined;
  filter.status = undefined;
  filter.keyword = '';
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

function openCreate(): void {
  editingId.value = '';
  Object.assign(form, {
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
  });
  agentOptions.value = [];
  dialogVisible.value = true;
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
  dialogVisible.value = true;
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
    cover: form.cover,
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
  dialogVisible.value = false;
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
  <section class="admin-page">
    <div class="page-toolbar">
      <h2 class="page-title">
        商品管理
      </h2>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新增商品
      </el-button>
    </div>

    <div class="page-filters">
      <el-select
        v-model="filter.categoryId"
        placeholder="全部分类"
        clearable
        style="width: 160px"
      >
        <el-option
          v-for="c in categories"
          :key="c.id"
          :label="c.name"
          :value="c.id"
        />
      </el-select>
      <el-select
        v-model="filter.status"
        placeholder="全部状态"
        clearable
        style="width: 140px"
      >
        <el-option
          v-for="opt in statusOptions.filter((o) => o.value)"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-input
        v-model="filter.keyword"
        placeholder="按商品名搜索"
        clearable
        style="width: 200px"
        @keyup.enter="search"
      />
      <el-button
        type="primary"
        @click="search"
      >
        查询
      </el-button>
      <el-button @click="resetSearch">
        重置
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="封面"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          <el-image
            v-if="row.cover"
            :src="row.cover"
            :preview-src-list="[row.cover]"
            preview-teleported
            fit="cover"
            class="cover-thumb"
          />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="商品名"
        min-width="160"
      />
      <el-table-column
        prop="categoryName"
        label="分类"
        width="120"
      />
      <el-table-column
        label="现价"
        width="110"
      >
        <template #default="{ row }">
          {{ yuan(row.priceFen) }}
        </template>
      </el-table-column>
      <el-table-column
        label="原价"
        width="110"
      >
        <template #default="{ row }">
          <span class="origin-price">{{ yuan(row.originPriceFen) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="sold"
        label="已售"
        width="90"
        align="center"
      />
      <el-table-column
        label="关联客服"
        min-width="120"
      >
        <template #default="{ row }">
          {{ row.serviceAgentName || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <el-tag :type="row.status === ProductStatus.OnShelf ? 'success' : 'info'">
            {{ row.status === ProductStatus.OnShelf ? '已上架' : '已下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="220"
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
            :type="row.status === ProductStatus.OnShelf ? 'warning' : 'success'"
            @click="togglePublish(row)"
          >
            {{ row.status === ProductStatus.OnShelf ? '下架' : '上架' }}
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
      :title="editingId ? '编辑商品' : '新增商品'"
      width="720px"
      top="6vh"
    >
      <el-form label-width="96px">
        <el-form-item
          label="分类"
          required
        >
          <el-select
            v-model="form.categoryId"
            placeholder="选择分类"
            style="width: 100%"
          >
            <el-option
              v-for="c in categories"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="商品名"
          required
        >
          <el-input
            v-model="form.title"
            maxlength="128"
          />
        </el-form-item>
        <el-form-item
          label="封面主标语"
          required
        >
          <el-input
            v-model="form.coverTitle"
            maxlength="128"
          />
        </el-form-item>
        <el-form-item label="封面副标语">
          <el-input
            v-model="form.coverSub"
            maxlength="128"
          />
        </el-form-item>
        <el-form-item label="封面图片">
          <ImageUploader v-model="form.cover" />
        </el-form-item>
        <el-form-item label="商品详情">
          <RichTextEditor
            v-model="form.description"
            placeholder="请输入商品详情，支持图文、视频"
          />
        </el-form-item>
        <el-form-item label="现价(元)">
          <el-input-number
            v-model="form.priceYuan"
            :min="0"
            :precision="2"
            :step="1"
          />
        </el-form-item>
        <el-form-item label="原价(元)">
          <el-input-number
            v-model="form.originPriceYuan"
            :min="0"
            :precision="2"
            :step="1"
          />
        </el-form-item>
        <el-form-item label="关联客服">
          <el-select
            v-model="form.serviceAgentId"
            filterable
            remote
            clearable
            reserve-keyword
            placeholder="搜索用户名/昵称"
            :remote-method="searchAgents"
            :loading="agentLoading"
            style="width: 100%"
            @focus="searchAgents('')"
          >
            <el-option
              v-for="a in agentOptions"
              :key="a.id"
              :label="`${a.nickname || a.username}（${a.username}）`"
              :value="a.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sort"
            :min="0"
          />
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
.page-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.page-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.origin-price {
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}
.cover-thumb {
  width: 48px;
  height: 48px;
  border-radius: 4px;
}
</style>
