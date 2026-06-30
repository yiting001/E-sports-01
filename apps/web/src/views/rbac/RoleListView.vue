<script setup lang="ts">
import type { RoleView } from '@app/contracts';
import { PAGINATION_DEFAULTS } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { roleApi } from '@/api/role.api';
import RolePermissionDialog from '@/components/rbac/RolePermissionDialog.vue';
import RoleDirectory from '@/components/rbac/role/RoleDirectory.vue';
import RoleFormDialog from '@/components/rbac/role/RoleFormDialog.vue';
import RoleStats from '@/components/rbac/role/RoleStats.vue';
import type { RoleForm } from '@/components/rbac/role/role-ui.types';
import './RoleListView.css';
import './RoleListView.responsive.css';

const list = ref<RoleView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const dialogVisible = ref(false);
const editingId = ref<string | null>(null);
const form = reactive<RoleForm>({ code: '', name: '', remark: '' });
const isEdit = computed(() => editingId.value !== null);

const permVisible = ref(false);
const permRole = ref<RoleView | null>(null);

const builtinCount = computed(() => list.value.filter((item) => item.isSuper).length);
const configurableCount = computed(() => Math.max(total.value - builtinCount.value, 0));
const permissionCount = computed(() =>
  list.value.reduce((sum, item) => sum + item.permissionIds.length, 0),
);

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
    const res = await roleApi.list(page.value, pageSize.value);
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
  editingId.value = null;
  form.code = '';
  form.name = '';
  form.remark = '';
  dialogVisible.value = true;
}

function openEdit(row: RoleView): void {
  editingId.value = row.id;
  form.code = row.code;
  form.name = row.name;
  form.remark = row.remark;
  dialogVisible.value = true;
}

function updateForm(value: RoleForm): void {
  Object.assign(form, value);
}

async function submit(): Promise<void> {
  if (!form.code || !form.name) {
    ElMessage.warning('编码与名称必填');
    return;
  }
  if (editingId.value) {
    await roleApi.update(editingId.value, { name: form.name, remark: form.remark });
  } else {
    await roleApi.create({ ...form });
  }
  ElMessage.success(isEdit.value ? '保存成功' : '创建成功');
  dialogVisible.value = false;
  await load();
}

function openPermissions(row: RoleView): void {
  permRole.value = row;
  permVisible.value = true;
}

async function remove(row: RoleView): Promise<void> {
  await ElMessageBox.confirm(`确认删除角色 ${row.name}？`, '提示', { type: 'warning' });
  await roleApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <section class="admin-page role-page">
    <role-stats
      :total="total"
      :builtin-count="builtinCount"
      :configurable-count="configurableCount"
      :permission-count="permissionCount"
    />
    <role-directory
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :format-date="formatDate"
      @refresh="load"
      @create="openCreate"
      @edit="openEdit"
      @permissions="openPermissions"
      @remove="remove"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
    <role-form-dialog
      v-model="dialogVisible"
      :form="form"
      :is-edit="isEdit"
      @update:form="updateForm"
      @submit="submit"
    />
    <role-permission-dialog
      v-model="permVisible"
      :role="permRole"
      @saved="load"
    />
  </section>
</template>
