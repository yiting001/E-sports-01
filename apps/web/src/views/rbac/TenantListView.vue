<script setup lang="ts">
import type { CreateTenantPayload, TenantView } from '@app/contracts';
import { TenantStatus } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { tenantApi } from '@/api/tenant.api';
import CreateTenantDialog from '@/components/rbac/tenant/CreateTenantDialog.vue';
import EditTenantDialog from '@/components/rbac/tenant/EditTenantDialog.vue';
import TenantDirectory from '@/components/rbac/tenant/TenantDirectory.vue';
import TenantHero from '@/components/rbac/tenant/TenantHero.vue';
import TenantStats from '@/components/rbac/tenant/TenantStats.vue';
import type { EditTenantForm } from '@/components/rbac/tenant/tenant-ui.types';
import './TenantListView.css';
import './TenantListView.responsive.css';

const list = ref<TenantView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const keyword = ref('');

const createVisible = ref(false);
const createForm = reactive<CreateTenantPayload>({
  code: '',
  name: '',
  remark: '',
  adminUsername: '',
  adminPassword: '',
});

const editVisible = ref(false);
const editForm = reactive<EditTenantForm>({
  id: '',
  name: '',
  status: TenantStatus.Enabled,
  remark: '',
  builtin: false,
});

const statusOptions = [
  { label: '启用', value: TenantStatus.Enabled },
  { label: '停用', value: TenantStatus.Disabled },
];

const enabledCount = computed(
  () => list.value.filter((item) => item.status === TenantStatus.Enabled).length,
);
const builtinCount = computed(() => list.value.filter((item) => item.builtin).length);
const normalCount = computed(() => Math.max(total.value - builtinCount.value, 0));

function statusLabel(status: TenantStatus): string {
  return status === TenantStatus.Enabled ? '启用' : '停用';
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
    const res = await tenantApi.list(page.value, pageSize.value, keyword.value || undefined);
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
  keyword.value = '';
  await search();
}

async function changePage(value: number): Promise<void> {
  page.value = value;
  await load();
}

function openCreate(): void {
  createForm.code = '';
  createForm.name = '';
  createForm.remark = '';
  createForm.adminUsername = '';
  createForm.adminPassword = '';
  createVisible.value = true;
}

function updateCreateForm(value: CreateTenantPayload): void {
  Object.assign(createForm, value);
}

async function create(): Promise<void> {
  if (!createForm.code || !createForm.name) {
    ElMessage.warning('租户编码与名称必填');
    return;
  }
  await tenantApi.create({
    code: createForm.code,
    name: createForm.name,
    remark: createForm.remark || undefined,
    adminUsername: createForm.adminUsername || undefined,
    adminPassword: createForm.adminPassword || undefined,
  });
  ElMessage.success('创建成功，已自动生成租户管理员账号');
  createVisible.value = false;
  await load();
}

function openEdit(row: TenantView): void {
  editForm.id = row.id;
  editForm.name = row.name;
  editForm.status = row.status;
  editForm.remark = row.remark;
  editForm.builtin = row.builtin;
  editVisible.value = true;
}

function updateEditForm(value: EditTenantForm): void {
  Object.assign(editForm, value);
}

async function saveEdit(): Promise<void> {
  await tenantApi.update(editForm.id, {
    name: editForm.name,
    status: editForm.status,
    remark: editForm.remark,
  });
  ElMessage.success('已保存');
  editVisible.value = false;
  await load();
}

async function remove(row: TenantView): Promise<void> {
  await ElMessageBox.confirm(
    `确认删除租户「${row.name}」？该租户下的数据将无法再访问。`,
    '提示',
    { type: 'warning' },
  );
  await tenantApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <section class="tenant-page">
    <tenant-hero />
    <tenant-stats
      :total="total"
      :enabled-count="enabledCount"
      :normal-count="normalCount"
    />
    <tenant-directory
      v-model:keyword="keyword"
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :status-label="statusLabel"
      :format-date="formatDate"
      @update:page="changePage"
      @search="search"
      @reset="resetSearch"
      @create="openCreate"
      @edit="openEdit"
      @remove="remove"
    />
    <create-tenant-dialog
      v-model="createVisible"
      :form="createForm"
      @update:form="updateCreateForm"
      @submit="create"
    />
    <edit-tenant-dialog
      v-model="editVisible"
      :form="editForm"
      :status-options="statusOptions"
      @update:form="updateEditForm"
      @submit="saveEdit"
    />
  </section>
</template>
