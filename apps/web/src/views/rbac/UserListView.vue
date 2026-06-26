<script setup lang="ts">
import type { UserView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { userApi, type CreateUserBody } from '@/api/user.api';

const list = ref<UserView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const dialogVisible = ref(false);
const form = reactive<CreateUserBody>({ username: '', password: '', nickname: '' });

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

function openCreate(): void {
  form.username = '';
  form.password = '';
  form.nickname = '';
  dialogVisible.value = true;
}

async function create(): Promise<void> {
  if (!form.username || !form.password) {
    ElMessage.warning('用户名与密码必填');
    return;
  }
  await userApi.create({ ...form });
  ElMessage.success('创建成功');
  dialogVisible.value = false;
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
        width="120"
      >
        <template #default="{ row }">
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
</style>
