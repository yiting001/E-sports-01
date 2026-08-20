<script setup lang="ts">
import type { RoleView, TenantView, UserListQuery, UserView } from '@app/contracts';
import { PAGINATION_DEFAULTS, PERMS, UserStatusEnum } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { userApi, type CreateUserBody } from '@/api/user.api';
import { roleApi } from '@/api/role.api';
import { tenantApi } from '@/api/tenant.api';
import CreateUserDialog from '@/components/rbac/user/CreateUserDialog.vue';
import EditUserDialog from '@/components/rbac/user/EditUserDialog.vue';
import ResetUserPasswordDialog from '@/components/rbac/user/ResetUserPasswordDialog.vue';
import UserDirectory from '@/components/rbac/user/UserDirectory.vue';
import UserStats from '@/components/rbac/user/UserStats.vue';
import type {
  EditUserForm,
  ResetUserPasswordForm,
  UserFiltersForm,
} from '@/components/rbac/user/user-ui.types';
import { useAuthStore } from '@/stores/auth.store';
import './UserListView.css';
import './UserListView.responsive.css';

const auth = useAuthStore();

const list = ref<UserView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const createVisible = ref(false);
const createForm = reactive<CreateUserBody>({
  username: '',
  password: '',
  nickname: '',
  phone: '',
  tenantId: '',
});

const tenants = ref<TenantView[]>([]);

const roles = ref<RoleView[]>([]);
const filters = reactive<UserFiltersForm>({
  keyword: '',
  status: '',
  roleId: '',
});
const editVisible = ref(false);
const editForm = reactive<EditUserForm>({
  id: '',
  username: '',
  nickname: '',
  phone: '',
  status: UserStatusEnum.Enabled,
  roleIds: [],
});
let originalRoleIds: string[] = [];

const resetPasswordVisible = ref(false);
const resetPasswordForm = reactive<ResetUserPasswordForm>({
  id: '',
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
});

const statusOptions = [
  { label: '启用', value: UserStatusEnum.Enabled },
  { label: '停用', value: UserStatusEnum.Disabled },
];

const enabledCount = computed(
  () => list.value.filter((item) => item.status === UserStatusEnum.Enabled).length,
);
const phoneBoundCount = computed(() => list.value.filter((item) => Boolean(item.phone)).length);
const assignedCount = computed(() => list.value.filter((item) => item.roles.length > 0).length);
const isSuper = computed(() => auth.profile?.isSuper === true);
const canFilterByRole = computed(() => auth.hasPermission(PERMS.role.list));

function statusLabel(status: UserStatusEnum): string {
  return status === UserStatusEnum.Enabled ? '启用' : '停用';
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
    const res = await userApi.list(page.value, pageSize.value, buildQuery());
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function buildQuery(): UserListQuery {
  const keyword = filters.keyword.trim();
  const query: UserListQuery = {};
  if (keyword) {
    query.keyword = keyword;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.roleId) {
    query.roleId = filters.roleId;
  }
  return query;
}

function updateFilters(value: UserFiltersForm): void {
  Object.assign(filters, value);
}

async function search(): Promise<void> {
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function resetFilters(): Promise<void> {
  filters.keyword = '';
  filters.status = '';
  filters.roleId = '';
  page.value = PAGINATION_DEFAULTS.page;
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

async function ensureRoles(): Promise<void> {
  if (roles.value.length === 0) {
    roles.value = (await roleApi.list(1, 100)).list;
  }
}

async function loadFilterRoles(): Promise<void> {
  if (canFilterByRole.value) {
    await ensureRoles();
  }
}

async function ensureTenants(): Promise<void> {
  if (isSuper.value && tenants.value.length === 0) {
    tenants.value = (await tenantApi.list(1, PAGINATION_DEFAULTS.maxPageSize)).list;
  }
}

function openCreate(): void {
  createForm.username = '';
  createForm.password = '';
  createForm.nickname = '';
  createForm.phone = '';
  createForm.tenantId = '';
  createVisible.value = true;
  void ensureTenants();
}

function updateCreateForm(value: CreateUserBody): void {
  Object.assign(createForm, value);
}

async function create(): Promise<void> {
  if (!createForm.username || !createForm.password) {
    ElMessage.warning('用户名与密码必填');
    return;
  }
  if (isSuper.value && !createForm.tenantId) {
    ElMessage.warning('请选择所属租户');
    return;
  }
  await userApi.create({
    ...createForm,
    phone: createForm.phone || undefined,
    tenantId: createForm.tenantId || undefined,
  });
  ElMessage.success('创建成功');
  createVisible.value = false;
  await load();
}

async function openEdit(row: UserView): Promise<void> {
  await ensureRoles();
  editForm.id = row.id;
  editForm.username = row.username;
  editForm.nickname = row.nickname;
  editForm.phone = row.phone;
  editForm.status = row.status;
  editForm.roleIds = row.roles.map((role) => role.id);
  originalRoleIds = [...editForm.roleIds];
  editVisible.value = true;
}

function openResetPassword(row: UserView): void {
  resetPasswordForm.id = row.id;
  resetPasswordForm.username = row.username;
  resetPasswordForm.nickname = row.nickname;
  resetPasswordForm.password = '';
  resetPasswordForm.confirmPassword = '';
  resetPasswordVisible.value = true;
}

function updateResetPasswordForm(value: ResetUserPasswordForm): void {
  Object.assign(resetPasswordForm, value);
}

async function resetPassword(): Promise<void> {
  const password = resetPasswordForm.password;
  if (password.length < 6 || password.length > 128) {
    ElMessage.warning('新密码长度需为 6-128 位');
    return;
  }
  if (password !== resetPasswordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致');
    return;
  }
  await userApi.resetPassword(resetPasswordForm.id, { password });
  ElMessage.success('密码已重置');
  resetPasswordVisible.value = false;
  await load();
}

function updateEditForm(value: EditUserForm): void {
  Object.assign(editForm, value);
}

function roleIdsChanged(current: string[], original: string[]): boolean {
  if (current.length !== original.length) {
    return true;
  }
  const originalSet = new Set(original);
  return current.some((id) => !originalSet.has(id));
}

async function saveEdit(): Promise<void> {
  await userApi.update(editForm.id, {
    nickname: editForm.nickname,
    phone: editForm.phone,
    status: editForm.status,
  });
  if (roleIdsChanged(editForm.roleIds, originalRoleIds)) {
    await userApi.assignRoles(editForm.id, editForm.roleIds);
  }
  ElMessage.success('已保存');
  editVisible.value = false;
  await load();
}

async function remove(row: UserView): Promise<void> {
  await ElMessageBox.confirm(`确认删除用户 ${row.username}？`, '提示', { type: 'warning' });
  await userApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(() => {
  void load();
  void loadFilterRoles();
});
</script>

<template>
  <section class="admin-page user-page">
    <user-stats
      :total="total"
      :enabled-count="enabledCount"
      :phone-bound-count="phoneBoundCount"
      :assigned-count="assignedCount"
    />
    <user-directory
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :is-super="isSuper"
      :can-filter-by-role="canFilterByRole"
      :filters="filters"
      :roles="roles"
      :status-options="statusOptions"
      :status-label="statusLabel"
      :format-date="formatDate"
      @refresh="load"
      @create="openCreate"
      @edit="openEdit"
      @reset-password="openResetPassword"
      @remove="remove"
      @search="search"
      @reset-filters="resetFilters"
      @update:filters="updateFilters"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
    <create-user-dialog
      v-model="createVisible"
      :form="createForm"
      :show-tenant="isSuper"
      :tenant-options="tenants"
      @update:form="updateCreateForm"
      @submit="create"
    />
    <edit-user-dialog
      v-model="editVisible"
      :form="editForm"
      :roles="roles"
      :status-options="statusOptions"
      @update:form="updateEditForm"
      @submit="saveEdit"
    />
    <reset-user-password-dialog
      v-model="resetPasswordVisible"
      :form="resetPasswordForm"
      @update:form="updateResetPasswordForm"
      @submit="resetPassword"
    />
  </section>
</template>
