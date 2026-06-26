<script setup lang="ts">
import type { PermissionNode } from '@app/contracts';
import { PermissionType } from '@app/contracts';
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  permissionApi,
  type CreatePermissionBody,
} from '@/api/permission.api';

const props = defineProps<{
  /** 弹窗显隐（v-model） */
  modelValue: boolean;
  /** 当前编辑的权限节点，null 表示新增 */
  permission: PermissionNode | null;
  /** 新增时的父节点，null 表示新增根权限；编辑时忽略 */
  parent: PermissionNode | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  /** 保存成功后通知父组件刷新树 */
  saved: [];
}>();

/** 权限类型可选项，复用枚举避免硬编码 */
const typeOptions: { label: string; value: PermissionType }[] = [
  { label: '菜单', value: PermissionType.Menu },
  { label: '按钮', value: PermissionType.Button },
  { label: '接口', value: PermissionType.Api },
];

/** 表单初值，集中一处便于重置 */
function emptyForm(): CreatePermissionBody {
  return {
    parentId: null,
    code: '',
    name: '',
    type: PermissionType.Menu,
    path: '',
    component: '',
    apiMethod: '',
    apiPath: '',
    icon: '',
    sort: 0,
  };
}

const form = reactive<CreatePermissionBody>(emptyForm());
const saving = ref(false);

const isEdit = computed(() => props.permission !== null);
const isMenu = computed(() => form.type === PermissionType.Menu);
const isApi = computed(() => form.type === PermissionType.Api);

const title = computed(() => {
  if (isEdit.value) {
    return '编辑权限';
  }
  return props.parent ? `新增子权限 · ${props.parent.name}` : '新增根权限';
});

/** 打开弹窗时按模式回填表单 */
function reset(): void {
  Object.assign(form, emptyForm());
  if (props.permission) {
    const p = props.permission;
    Object.assign(form, {
      parentId: p.parentId,
      code: p.code,
      name: p.name,
      type: p.type,
      path: p.path ?? '',
      component: p.component ?? '',
      apiMethod: p.apiMethod ?? '',
      apiPath: p.apiPath ?? '',
      icon: p.icon ?? '',
      sort: p.sort,
    });
  } else {
    form.parentId = props.parent?.id ?? null;
  }
}

async function submit(): Promise<void> {
  if (!form.name || (!isEdit.value && !form.code)) {
    ElMessage.warning('编码与名称必填');
    return;
  }
  saving.value = true;
  try {
    if (props.permission) {
      await permissionApi.update(props.permission.id, {
        name: form.name,
        path: form.path,
        component: form.component,
        apiMethod: form.apiMethod,
        apiPath: form.apiPath,
        icon: form.icon,
        sort: form.sort,
      });
    } else {
      await permissionApi.create({ ...form });
    }
    ElMessage.success(isEdit.value ? '保存成功' : '创建成功');
    emit('saved');
    emit('update:modelValue', false);
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      reset();
    }
  },
);
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="520px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <el-form label-width="92px">
      <el-form-item label="权限类型">
        <el-select
          v-model="form.type"
          :disabled="isEdit"
          placeholder="请选择"
        >
          <el-option
            v-for="opt in typeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="权限码">
        <el-input
          v-model="form.code"
          :disabled="isEdit"
          placeholder="如 rbac:user:create"
        />
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <template v-if="isMenu">
        <el-form-item label="路由路径">
          <el-input v-model="form.path" />
        </el-form-item>
        <el-form-item label="组件路径">
          <el-input v-model="form.component" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" />
        </el-form-item>
      </template>
      <template v-if="isApi">
        <el-form-item label="接口方法">
          <el-input
            v-model="form.apiMethod"
            placeholder="如 POST"
          />
        </el-form-item>
        <el-form-item label="接口路径">
          <el-input
            v-model="form.apiPath"
            placeholder="如 /rbac/users"
          />
        </el-form-item>
      </template>
      <el-form-item label="排序">
        <el-input-number
          v-model="form.sort"
          :min="0"
        />
      </el-form-item>
    </el-form>
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
