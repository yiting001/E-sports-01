<script setup lang="ts">
import type { PermissionNode } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { permissionApi } from '@/api/permission.api';
import PermissionFormDialog from '@/components/rbac/PermissionFormDialog.vue';

const tree = ref<PermissionNode[]>([]);
const loading = ref(false);

const treeProps = { children: 'children', label: 'name' } as const;

const dialogVisible = ref(false);
/** 当前编辑的节点，null 表示新增 */
const editing = ref<PermissionNode | null>(null);
/** 新增时的父节点，null 表示新增根权限 */
const parent = ref<PermissionNode | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    tree.value = await permissionApi.tree();
  } finally {
    loading.value = false;
  }
}

/** 新增：root 表示新增根权限，否则在该节点下新增子权限 */
function openCreate(parentNode: PermissionNode | null): void {
  editing.value = null;
  parent.value = parentNode;
  dialogVisible.value = true;
}

function openEdit(node: PermissionNode): void {
  editing.value = node;
  parent.value = null;
  dialogVisible.value = true;
}

async function remove(node: PermissionNode): Promise<void> {
  await ElMessageBox.confirm(`确认删除权限 ${node.name}？`, '提示', {
    type: 'warning',
  });
  await permissionApi.remove(node.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <el-card v-loading="loading">
    <div class="toolbar">
      <el-button
        v-permission="PERMS.permission.create"
        type="primary"
        @click="openCreate(null)"
      >
        新增根权限
      </el-button>
    </div>
    <el-tree
      :data="tree"
      :props="treeProps"
      node-key="id"
      default-expand-all
    >
      <template #default="{ data }">
        <span class="node">
          <span class="name">{{ data.name }}</span>
          <el-tag
            size="small"
            class="type"
          >{{ data.type }}</el-tag>
          <span class="code">{{ data.code }}</span>
          <span class="ops">
            <el-button
              v-permission="PERMS.permission.create"
              type="primary"
              link
              @click.stop="openCreate(data)"
            >
              新增子权限
            </el-button>
            <el-button
              v-permission="PERMS.permission.update"
              type="primary"
              link
              @click.stop="openEdit(data)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.permission.remove"
              type="danger"
              link
              @click.stop="remove(data)"
            >
              删除
            </el-button>
          </span>
        </span>
      </template>
    </el-tree>

    <permission-form-dialog
      v-model="dialogVisible"
      :permission="editing"
      :parent="parent"
      @saved="load"
    />
  </el-card>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
}
.node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.code {
  color: #909399;
  font-size: 12px;
}
.type {
  text-transform: uppercase;
}
.ops {
  margin-left: auto;
}
</style>
