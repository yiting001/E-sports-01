<script setup lang="ts">
import type { PermissionNode, PermissionType } from '@app/contracts';
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { permissionApi } from '@/api/permission.api';
import PermissionDirectory from '@/components/rbac/permission/PermissionDirectory.vue';
import PermissionFormDialog from '@/components/rbac/PermissionFormDialog.vue';
import PermissionHero from '@/components/rbac/permission/PermissionHero.vue';
import PermissionStats from '@/components/rbac/permission/PermissionStats.vue';
import {
  buildNamespaceTree,
  flattenPermissions,
  type PermissionTreeNode,
} from '@/utils/permission-tree';
import './PermissionListView.css';
import './PermissionListView.responsive.css';

const flat = ref<PermissionNode[]>([]);
const loading = ref(false);

const tree = computed(() => buildNamespaceTree(flat.value));
const permissions = computed(() => flattenPermissions(flat.value));
const namespaceCount = computed(() => countGroups(tree.value));
const typeCounts = computed(() => countPermissionTypes(permissions.value));

const dialogVisible = ref(false);
const editing = ref<PermissionNode | null>(null);
const codePrefix = ref('');

function countGroups(nodes: PermissionTreeNode[]): number {
  return nodes.reduce((sum, node) => {
    const current = node.isGroup ? 1 : 0;
    return sum + current + countGroups(node.children);
  }, 0);
}

function countPermissionTypes(nodes: PermissionNode[]): Record<PermissionType, number> {
  return nodes.reduce(
    (acc, node) => {
      acc[node.type] += 1;
      return acc;
    },
    { api: 0, button: 0, menu: 0 } as Record<PermissionType, number>,
  );
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    flat.value = await permissionApi.tree();
  } finally {
    loading.value = false;
  }
}

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
  <section class="permission-page">
    <permission-hero />
    <permission-stats
      :total="permissions.length"
      :namespace-count="namespaceCount"
      :api-count="typeCounts.api"
      :menu-count="typeCounts.menu"
      :button-count="typeCounts.button"
    />
    <permission-directory
      :tree="tree"
      :loading="loading"
      @refresh="load"
      @create="openCreate"
      @edit="openEdit"
      @remove="remove"
    />
    <permission-form-dialog
      v-model="dialogVisible"
      :permission="editing"
      :code-prefix="codePrefix"
      @saved="load"
    />
  </section>
</template>
