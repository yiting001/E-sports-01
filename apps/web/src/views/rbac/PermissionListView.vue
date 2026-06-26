<script setup lang="ts">
import type { PermissionNode } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { permissionApi } from '@/api/permission.api';
import PermissionFormDialog from '@/components/rbac/PermissionFormDialog.vue';
import {
  buildNamespaceTree,
  type PermissionTreeNode,
} from '@/utils/permission-tree';

const flat = ref<PermissionNode[]>([]);
const loading = ref(false);

/** 按权限码命名空间组织的展示树 */
const tree = computed(() => buildNamespaceTree(flat.value));
const treeProps = { children: 'children', label: 'label' } as const;

const dialogVisible = ref(false);
/** 当前编辑的真实权限，null 表示新增 */
const editing = ref<PermissionNode | null>(null);
/** 新增时预填的权限码前缀 */
const codePrefix = ref('');

async function load(): Promise<void> {
  loading.value = true;
  try {
    flat.value = await permissionApi.tree();
  } finally {
    loading.value = false;
  }
}

/** 新增：传入命名空间路径作为权限码前缀，空表示新增顶级权限 */
function openCreate(prefix: string): void {
  editing.value = null;
  codePrefix.value = prefix ? `${prefix}:` : '';
  dialogVisible.value = true;
}

function openEdit(node: PermissionTreeNode): void {
  editing.value = node.permission;
  codePrefix.value = '';
  dialogVisible.value = true;
}

async function remove(node: PermissionTreeNode): Promise<void> {
  if (!node.permission) {
    return;
  }
  await ElMessageBox.confirm(`确认删除权限 ${node.label}？`, '提示', {
    type: 'warning',
  });
  await permissionApi.remove(node.permission.id);
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
        @click="openCreate('')"
      >
        新增权限
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
          <span class="name">{{ data.label }}</span>
          <el-tag
            v-if="!data.isGroup"
            size="small"
            class="type"
          >{{ data.permission.type }}</el-tag>
          <span class="code">{{ data.code }}</span>
          <span class="ops">
            <el-button
              v-if="data.isGroup"
              v-permission="PERMS.permission.create"
              type="primary"
              link
              @click.stop="openCreate(data.code)"
            >
              新增子权限
            </el-button>
            <template v-else>
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
            </template>
          </span>
        </span>
      </template>
    </el-tree>

    <permission-form-dialog
      v-model="dialogVisible"
      :permission="editing"
      :code-prefix="codePrefix"
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
