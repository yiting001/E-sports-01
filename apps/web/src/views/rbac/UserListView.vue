<script setup lang="ts">
import type { RoleView, UserView } from '@app/contracts';
import { UserStatusEnum } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { userApi, type CreateUserBody } from '@/api/user.api';
import { roleApi } from '@/api/role.api';
import CreateUserDialog from '@/components/rbac/user/CreateUserDialog.vue';
import EditUserDialog from '@/components/rbac/user/EditUserDialog.vue';
import UserDirectory from '@/components/rbac/user/UserDirectory.vue';
import UserHero from '@/components/rbac/user/UserHero.vue';
import UserStats from '@/components/rbac/user/UserStats.vue';
import type { EditUserForm } from '@/components/rbac/user/user-ui.types';
import { useAuthStore } from '@/stores/auth.store';
import './UserListView.css';
import './UserListView.responsive.css';

const auth = useAuthStore();

const list = ref<UserView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const createVisible = ref(false);
const createForm = reactive<CreateUserBody>({
  username: '',
  password: '',
  nickname: '',
  phone: '',
});

const roles = ref<RoleView[]>([]);
const editVisible = ref(false);
const editForm = reactive<EditUserForm>({
  id: '',
  username: '',
  nickname: '',
  phone: '',
  status: UserStatusEnum.Enabled,
  roleId: '',
});
let originalRoleId = '';

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
    const res = await userApi.list(page.value, pageSize.value);
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

async function ensureRoles(): Promise<void> {
  if (roles.value.length === 0) {
    roles.value = (await roleApi.list(1, 100)).list;
  }
}

function openCreate(): void {
  createForm.username = '';
  createForm.password = '';
  createForm.nickname = '';
  createForm.phone = '';
  createVisible.value = true;
}

function updateCreateForm(value: CreateUserBody): void {
  Object.assign(createForm, value);
}

async function create(): Promise<void> {
  if (!createForm.username || !createForm.password) {
    ElMessage.warning('用户名与密码必填');
    return;
  }
  await userApi.create({ ...createForm, phone: createForm.phone || undefined });
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
  editForm.roleId = row.roles[0]?.id ?? '';
  originalRoleId = editForm.roleId;
  editVisible.value = true;
}

function updateEditForm(value: EditUserForm): void {
  Object.assign(editForm, value);
}

async function saveEdit(): Promise<void> {
  await userApi.update(editForm.id, {
    nickname: editForm.nickname,
    phone: editForm.phone,
    status: editForm.status,
  });
  if (editForm.roleId !== originalRoleId) {
    await userApi.assignRoles(editForm.id, editForm.roleId ? [editForm.roleId] : []);
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

onMounted(load);
</script>

<template>
  <section class="user-page">
    <user-hero />
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
      :status-label="statusLabel"
      :format-date="formatDate"
      @refresh="load"
      @create="openCreate"
      @edit="openEdit"
      @remove="remove"
      @update:page="changePage"
    />
    <create-user-dialog
      v-model="createVisible"
      :form="createForm"
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
  </section>
</template>
