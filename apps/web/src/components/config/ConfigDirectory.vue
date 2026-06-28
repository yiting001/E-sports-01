<script setup lang="ts">
import type { ConfigItemView } from '@app/contracts';
import { ConfigGroup, ConfigValueType, PERMS } from '@app/contracts';
import { Delete, EditPen, Key, Lock, Plus, Refresh, Search } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import { sanitizeHtml } from '@/utils/sanitize-html';
import { CONFIG_GROUP_META, CONFIG_TYPE_META } from './config-ui';

defineProps<{
  list: ConfigItemView[];
  loading: boolean;
  keyword: string;
  total: number;
  matchedCount: number;
}>();

const emit = defineEmits<{
  'update:keyword': [value: string];
  refresh: [];
  create: [];
  edit: [row: ConfigItemView];
  remove: [row: ConfigItemView];
}>();

function groupLabel(group: ConfigGroup): string {
  return CONFIG_GROUP_META[group].label;
}

function typeLabel(type: ConfigValueType): string {
  return CONFIG_TYPE_META[type].label;
}

function typeTone(type: ConfigValueType): string {
  return CONFIG_TYPE_META[type].tone;
}
</script>

<template>
  <section class="config-panel">
    <div class="config-panel__head">
      <div>
        <span class="config-eyebrow">Directory</span>
        <h2>配置目录</h2>
      </div>
      <div class="config-panel__actions">
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
        <el-button
          v-permission="PERMS.config.save"
          type="primary"
          :icon="Plus"
          @click="emit('create')"
        >
          新增配置
        </el-button>
      </div>
    </div>

    <div class="config-toolbar">
      <el-input
        :model-value="keyword"
        class="config-search"
        :prefix-icon="Search"
        clearable
        placeholder="搜索配置键、分组、类型或备注"
        @update:model-value="emit('update:keyword', String($event))"
      />
      <span class="config-toolbar__meta">
        {{ keyword ? `${matchedCount} / ${total}` : `${total} 项配置` }}
      </span>
    </div>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="900"
      table-class="config-table"
      empty-text="暂无配置"
    >
      <el-table-column
        label="配置键"
        min-width="220"
      >
        <template #default="{ row }">
          <div class="config-key">
            <span :class="['config-key__icon', row.secret ? 'is-secret' : '']">
              <el-icon>
                <Lock v-if="row.secret" />
                <Key v-else />
              </el-icon>
            </span>
            <div>
              <strong>{{ row.key }}</strong>
              <small>{{ groupLabel(row.group) }} / {{ row.group }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="值"
        min-width="250"
      >
        <template #default="{ row }">
          <span
            v-if="row.secret"
            class="config-secret"
          >
            ******
          </span>
          <!-- 内容已经 DOMPurify 净化，安全渲染 -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-else-if="row.type === ConfigValueType.RichText"
            class="config-rich-preview"
            v-html="sanitizeHtml(row.value)"
          />
          <!-- eslint-enable vue/no-v-html -->
          <span
            v-else
            class="config-value"
          >
            {{ row.value || '-' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <span :class="['config-type', `is-${typeTone(row.type)}`]">
            {{ typeLabel(row.type) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="备注"
        min-width="170"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="config-muted">{{ row.remark || '暂无备注' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="150"
      >
        <template #default="{ row }">
          <div class="config-actions">
            <el-button
              v-permission="PERMS.config.save"
              type="primary"
              link
              :icon="EditPen"
              @click="emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.config.remove"
              type="danger"
              link
              :icon="Delete"
              @click="emit('remove', row)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </app-data-table>
  </section>
</template>
