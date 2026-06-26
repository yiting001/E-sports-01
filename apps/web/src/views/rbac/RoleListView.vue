<script setup lang="ts">
import type { RoleView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { roleApi, type CreateRoleBody } from '@/api/role.api';

const list = ref<RoleView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const dialogVisible = ref(false);
const form = reactive<CreateRoleBody>({ code: '', name: '', remark: '' });

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

function openCreate(): void {
  form.code = '';
  form.name = '';
  form.remark = '';
  dialogVisible.value = true;
}

async function create(): Promise<void> {
  if (!form.code || !form.name) {
    ElMessage.warning('编码与名称必填');
    return;
  }
  await roleApi.create({ ...form });
  ElMessage.success('创建成功');
  dialogVisible.value = false;
  await load();
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
  <div>
    <div class="toolbar">
      <el-button
        v-permission="PERMS.role.create"
        type="primary"
        @click="openCreate"
      >
        新建角色
      </el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="list"
      border
    >
      <el-table-column
        prop="code"
        label="编码"
      />
      <el-table-column
        prop="name"
        label="名称"
      />
      <el-table-column
        prop="remark"
        label="备注"
      />
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
            v-permission="PERMS.role.remove"
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
      title="新建角色"
      width="420px"
    >
      <el-form label-width="72px">
        <el-form-item label="编码">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" />
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
</style>
