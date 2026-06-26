<script setup lang="ts">
import type { RoleView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { roleApi, type CreateRoleBody } from '@/api/role.api';
import RolePermissionDialog from '@/components/rbac/RolePermissionDialog.vue';

const list = ref<RoleView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const dialogVisible = ref(false);
/** 当前编辑的角色 id，null 表示新建 */
const editingId = ref<string | null>(null);
const form = reactive<CreateRoleBody>({ code: '', name: '', remark: '' });
const isEdit = computed(() => editingId.value !== null);

const permVisible = ref(false);
const permRole = ref<RoleView | null>(null);

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
        width="240"
      >
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.role.update"
            type="primary"
            link
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-permission="PERMS.role.assignPermissions"
            type="primary"
            link
            @click="openPermissions(row)"
          >
            分配权限
          </el-button>
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
      :title="isEdit ? '编辑角色' : '新建角色'"
      width="420px"
    >
      <el-form label-width="72px">
        <el-form-item label="编码">
          <el-input
            v-model="form.code"
            :disabled="isEdit"
          />
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
          @click="submit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <role-permission-dialog
      v-model="permVisible"
      :role="permRole"
      @saved="load"
    />
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
