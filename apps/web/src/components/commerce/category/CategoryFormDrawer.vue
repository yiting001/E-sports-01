<script setup lang="ts">
import { CircleCheckFilled, Picture } from '@element-plus/icons-vue';
import ImageUploader from '@/components/common/ImageUploader.vue';
import type { CategoryFormModel } from '@/components/commerce/commerce-ui.types';

const props = defineProps<{
  modelValue: boolean;
  form: CategoryFormModel;
  isEdit: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: CategoryFormModel];
  submit: [];
}>();

function updateForm(patch: Partial<CategoryFormModel>): void {
  emit('update:form', { ...props.form, ...patch });
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="isEdit ? '编辑分类' : '新建分类'"
    size="520px"
    class="admin-drawer commerce-drawer"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="commerce-drawer__intro">
      <el-icon>
        <Picture v-if="form.icon" />
        <CircleCheckFilled v-else />
      </el-icon>
      <span>{{ form.icon ? '图片图标会优先展示在 C 端分类入口。' : '未上传图片时，C 端使用文字图标或分类名展示。' }}</span>
    </div>

    <el-form
      label-position="top"
      class="commerce-form"
    >
      <el-form-item
        label="分类名"
        required
      >
        <el-input
          :model-value="form.name"
          maxlength="64"
          show-word-limit
          placeholder="如：大红单"
          @update:model-value="(value: string) => updateForm({ name: value })"
        />
      </el-form-item>

      <el-form-item label="图标图片">
        <ImageUploader
          :model-value="form.icon"
          @update:model-value="(value: string) => updateForm({ icon: value })"
        />
        <span class="commerce-form__hint">适合上传正方形图标；设置后优先展示图片。</span>
      </el-form-item>

      <el-form-item label="文字图标">
        <el-input
          :model-value="form.cover"
          maxlength="64"
          placeholder="无图片时展示，如：红单"
          @update:model-value="(value: string) => updateForm({ cover: value })"
        />
      </el-form-item>

      <div class="commerce-form__grid">
        <el-form-item label="排序">
          <el-input-number
            :model-value="form.sort"
            :min="0"
            controls-position="right"
            @update:model-value="(value: number | undefined) => updateForm({ sort: value ?? 0 })"
          />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch
            :model-value="form.enabled"
            active-text="启用"
            inactive-text="停用"
            @update:model-value="(value: boolean) => updateForm({ enabled: value })"
          />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="emit('update:modelValue', false)">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="emit('submit')"
        >
          {{ isEdit ? '保存' : '确定创建' }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
