<script setup lang="ts">
import type { CreateTenantPayload, TenantView } from '@app/contracts';
import { PERMS, TenantStatus } from '@app/contracts';
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { tenantApi } from '@/api/tenant.api';

const list = ref<TenantView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const createVisible = ref(false);
const createForm = reactive<CreateTenantPayload>({
  code: '',
  name: '',
  remark: '',
  adminUsername: '',
  adminPassword: '',
});

const editVisible = ref(false);
const editForm = reactive<{
  id: string;
  name: string;
  status: TenantStatus;
  remark: string;
  builtin: boolean;
}>({ id: '', name: '', status: TenantStatus.Enabled, remark: '', builtin: false });

const statusOptions = [
  { label: '启用', value: TenantStatus.Enabled },
  { label: '停用', value: TenantStatus.Disabled },
];

function statusLabel(status: TenantStatus): string {
  return status === TenantStatus.Enabled ? '启用' : '停用';
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await tenantApi.list(page.value, pageSize.value);
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  createForm.code = '';
  createForm.name = '';
  createForm.remark = '';
  createForm.adminUsername = '';
  createForm.adminPassword = '';
  createVisible.value = true;
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
  <div>
    <div class="toolbar">
      <el-button
        v-permission="PERMS.tenant.create"
        type="primary"
        @click="openCreate"
      >
        新建租户
      </el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="list"
      border
    >
      <el-table-column
        prop="code"
        label="租户编码"
        width="160"
      />
      <el-table-column
        prop="name"
        label="名称"
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="row.status === TenantStatus.Enabled ? 'success' : 'info'">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.builtin"
            type="warning"
          >
            内置
          </el-tag>
          <span v-else>普通</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="remark"
        label="备注"
        show-overflow-tooltip
      />
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
            v-permission="PERMS.tenant.update"
            type="primary"
            link
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-permission="PERMS.tenant.remove"
            type="danger"
            link
            :disabled="row.builtin"
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
      v-model="createVisible"
      title="新建租户"
      width="460px"
    >
      <el-form label-width="92px">
        <el-form-item label="租户编码">
          <el-input
            v-model="createForm.code"
            placeholder="小写字母/数字/连字符，登录时可用于区分租户"
          />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="createForm.name" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.remark"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="管理员账号">
          <el-input
            v-model="createForm.adminUsername"
            placeholder="选填，默认为 <编码>_admin"
          />
        </el-form-item>
        <el-form-item label="管理员密码">
          <el-input
            v-model="createForm.adminPassword"
            type="password"
            show-password
            placeholder="选填，默认使用平台初始密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">
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
      title="编辑租户"
      width="460px"
    >
      <el-form label-width="72px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="editForm.status"
            :disabled="editForm.builtin"
            class="full"
          >
            <el-option
              v-for="s in statusOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="2"
          />
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
.full {
  width: 100%;
}
</style>
