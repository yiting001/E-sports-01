<script setup lang="ts">
import type { PermissionNode, RoleView } from '@app/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { ElMessage, ElTree } from 'element-plus';
import { permissionApi } from '@/api/permission.api';
import { roleApi } from '@/api/role.api';
import {
  buildNamespaceTree,
  flattenPermissions,
  pickRealPermissionIds,
  type PermissionTreeNode,
} from '@/utils/permission-tree';

const props = defineProps<{
  /** 弹窗显隐（v-model） */
  modelValue: boolean;
  /** 当前编辑的角色，null 表示未选中 */
  role: RoleView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  /** 分配成功后通知父组件刷新列表 */
  saved: [];
}>();

/** 超管角色拥有全部权限：树置为只读、全选，禁止单独分配 */
const readonly = computed(() => props.role?.isSuper === true);
const treeProps = computed(() => ({
  children: 'children',
  label: 'label',
  disabled: () => readonly.value,
}));

const tree = ref<PermissionTreeNode[]>([]);
const loading = ref(false);
const saving = ref(false);
const treeRef = ref<InstanceType<typeof ElTree>>();

/** 拉取权限树并按角色已有权限回显勾选；超管则全选 */
async function loadTree(role: RoleView): Promise<void> {
  loading.value = true;
  try {
    const flat = await permissionApi.tree();
    tree.value = buildNamespaceTree(flat);
    await nextTick();
    treeRef.value?.setCheckedKeys(
      role.isSuper ? allPermissionIds(flat) : role.permissionIds,
    );
  } finally {
    loading.value = false;
  }
}

/** 全部真实权限 id，用于超管全选 */
function allPermissionIds(flat: PermissionNode[]): string[] {
  return flattenPermissions(flat).map((p) => p.id);
}

/** 收集选中的真实权限：剔除按命名空间派生的虚拟分组节点 */
function collectCheckedIds(): string[] {
  const checked = (treeRef.value?.getCheckedKeys() ?? []) as string[];
  const halfChecked = (treeRef.value?.getHalfCheckedKeys() ?? []) as string[];
  return pickRealPermissionIds([...checked, ...halfChecked]);
}

async function submit(): Promise<void> {
  if (!props.role || readonly.value) {
    return;
  }
  saving.value = true;
  try {
    await roleApi.assignPermissions(props.role.id, collectCheckedIds());
    ElMessage.success('权限已更新');
    emit('saved');
    emit('update:modelValue', false);
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible && props.role) {
      void loadTree(props.role);
    }
  },
);
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="role ? `分配权限 · ${role.name}` : '分配权限'"
    width="480px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <el-alert
      v-if="readonly"
      type="info"
      :closable="false"
      title="超级管理员内置拥有全部权限，无需也无法单独分配"
      class="hint"
    />
    <el-tree
      ref="treeRef"
      v-loading="loading"
      :data="tree"
      :props="treeProps"
      node-key="id"
      show-checkbox
      default-expand-all
    >
      <template #default="{ data }">
        <span class="node">
          <span>{{ data.label }}</span>
          <span class="code">{{ data.code }}</span>
        </span>
      </template>
    </el-tree>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ readonly ? '关闭' : '取消' }}
      </el-button>
      <el-button
        v-if="!readonly"
        type="primary"
        :loading="saving"
        @click="submit"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hint {
  margin-bottom: 12px;
}
.node {
  display: flex;
  align-items: center;
  gap: 8px;
}
.code {
  color: #909399;
  font-size: 12px;
}
</style>
