<script setup lang="ts">
import type { PermissionNode, RoleView } from '@app/contracts';
import { nextTick, ref, watch } from 'vue';
import { ElMessage, ElTree } from 'element-plus';
import { permissionApi } from '@/api/permission.api';
import { roleApi } from '@/api/role.api';

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

const treeProps = { children: 'children', label: 'name' } as const;

const tree = ref<PermissionNode[]>([]);
const loading = ref(false);
const saving = ref(false);
const treeRef = ref<InstanceType<typeof ElTree>>();

/** 拉取权限树并按角色已有权限回显勾选 */
async function loadTree(role: RoleView): Promise<void> {
  loading.value = true;
  try {
    tree.value = await permissionApi.tree();
    await nextTick();
    treeRef.value?.setCheckedKeys(role.permissionIds);
  } finally {
    loading.value = false;
  }
}

/** 收集选中节点：全选 + 半选，半选用于保留父级菜单授权 */
function collectCheckedIds(): string[] {
  const checked = (treeRef.value?.getCheckedKeys() ?? []) as string[];
  const halfChecked = (treeRef.value?.getHalfCheckedKeys() ?? []) as string[];
  return [...checked, ...halfChecked];
}

async function submit(): Promise<void> {
  if (!props.role) {
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
          <span>{{ data.name }}</span>
          <span class="code">{{ data.code }}</span>
        </span>
      </template>
    </el-tree>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button
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
