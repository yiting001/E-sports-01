<script setup lang="ts">
/**
 * 主题特效管理页：按当前租户勾选 C 端启用的 Canvas UI 背景特效（可多选同时启用）。
 * 保存为整量覆盖；全部取消勾选即关闭特效。
 * 特效基于 Chrome html-in-canvas API，浏览器不支持时 C 端自动降级为普通页面。
 */
import { onMounted, ref } from 'vue';
import { THEME_EFFECT_OPTIONS, type ThemeEffect } from '@app/contracts';
import { ElMessage } from 'element-plus';
import AppPanel from '@/components/common/AppPanel.vue';
import { themeApi } from '@/api/theme.api';

const selected = ref<ThemeEffect[]>([]);
const loading = ref(false);
const saving = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const view = await themeApi.getEffects();
    selected.value = view.effects;
  } catch {
    ElMessage.error('主题特效配置加载失败');
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  saving.value = true;
  try {
    const view = await themeApi.updateEffects(selected.value);
    selected.value = view.effects;
    ElMessage.success('已保存，C 端刷新后生效');
  } catch {
    ElMessage.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <AppPanel
    title="主题特效"
    description="为 C 端配置全站背景特效（本租户生效，可同时启用多个）；特效依赖 Chrome html-in-canvas 能力，不支持的浏览器自动降级为普通页面"
  >
    <template #actions>
      <el-button
        type="primary"
        :loading="saving"
        @click="save"
      >
        保存
      </el-button>
    </template>

    <div
      v-loading="loading"
      class="effect-list"
    >
      <el-checkbox-group v-model="selected">
        <label
          v-for="option in THEME_EFFECT_OPTIONS"
          :key="option.value"
          class="effect-item"
        >
          <el-checkbox :value="option.value">
            {{ option.label }}
          </el-checkbox>
          <span class="effect-desc">{{ option.description }}</span>
        </label>
      </el-checkbox-group>
    </div>
  </AppPanel>
</template>

<style scoped>
.effect-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
}

.effect-item:last-child {
  border-bottom: none;
}

.effect-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
