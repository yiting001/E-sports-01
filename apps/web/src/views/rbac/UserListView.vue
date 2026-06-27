<script setup lang="ts">
import type { RoleView, UserView } from '@app/contracts';
import { PERMS, UserStatusEnum } from '@app/contracts';
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { userApi, type CreateUserBody } from '@/api/user.api';
import { roleApi } from '@/api/role.api';

const list = ref<UserView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const dialogVisible = ref(false);
const form = reactive<CreateUserBody>({ username: '', password: '', nickname: '', phone: '' });

const roles = ref<RoleView[]>([]);
const editVisible = ref(false);
const editForm = reactive<{
  id: string;
  nickname: string;
  phone: string;
  status: UserStatusEnum;
  roleId: string;
}>({ id: '', nickname: '', phone: '', status: UserStatusEnum.Enabled, roleId: '' });
let originalRoleId = '';

const statusOptions = [
  { label: '启用', value: UserStatusEnum.Enabled },
  { label: '停用', value: UserStatusEnum.Disabled },
];

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

async function ensureRoles(): Promise<void> {
  if (roles.value.length === 0) {
    roles.value = (await roleApi.list(1, 100)).list;
  }
}

function openCreate(): void {
  form.username = '';
  form.password = '';
  form.nickname = '';
  form.phone = '';
  dialogVisible.value = true;
}

async function create(): Promise<void> {
  if (!form.username || !form.password) {
    ElMessage.warning('用户名与密码必填');
    return;
  }
  await userApi.create({ ...form, phone: form.phone || undefined });
  ElMessage.success('创建成功');
  dialogVisible.value = false;
  await load();
}

async function openEdit(row: UserView): Promise<void> {
  await ensureRoles();
  editForm.id = row.id;
  editForm.nickname = row.nickname;
  editForm.phone = row.phone;
  editForm.status = row.status;
  editForm.roleId = row.roles[0]?.id ?? '';
  originalRoleId = editForm.roleId;
  editVisible.value = true;
}

async function saveEdit(): Promise<void> {
  await userApi.update(editForm.id, {
    nickname: editForm.nickname,
    phone: editForm.phone,
    status: editForm.status,
  });
  if (editForm.roleId !== originalRoleId) {
    await userApi.assignRoles(
      editForm.id,
      editForm.roleId ? [editForm.roleId] : [],
    );
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
  <div>
    <div class="toolbar">
      <el-button
        v-permission="PERMS.user.create"
        type="primary"
        @click="openCreate"
      >
        新建用户
      </el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="list"
      border
    >
      <el-table-column
        prop="username"
        label="用户名"
      />
      <el-table-column
        prop="nickname"
        label="昵称"
      />
      <el-table-column
        prop="phone"
        label="手机号"
        width="140"
      />
      <el-table-column
        prop="status"
        label="状态"
        width="100"
      />
      <el-table-column label="角色">
        <template #default="{ row }">
          <el-tag
            v-for="r in row.roles"
            :key="r.id"
            class="tag"
          >
            {{ r.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="200"
      />
      <el-table-column
        label="操作"
        width="160"
      >
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.user.update"
            type="primary"
            link
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-permission="PERMS.user.remove"
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

    <el-dialog
      v-model="dialogVisible"
      title="新建用户"
      width="420px"
    >
      <el-form label-width="72px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="form.phone"
            maxlength="11"
            placeholder="选填，用于短信登录"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="create"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editVisible"
      title="编辑用户"
      width="420px"
    >
      <el-form label-width="72px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="editForm.phone"
            maxlength="11"
            placeholder="用于短信登录，留空可解绑"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status">
            <el-option
              v-for="s in statusOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="editForm.roleId"
            clearable
            placeholder="单选一个角色（可清空）"
            class="full"
          >
            <el-option
              v-for="r in roles"
              :key="r.id"
              :label="r.name"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="saveEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
}
.pager {
  margin-top: 12px;
}
.tag {
  margin-right: 4px;
}
.full {
  width: 100%;
}
</style>
