<script setup lang="ts">
import { PERMS } from '@app/contracts';
import { ArrowRight, Delete, EditPen, FolderOpened, Plus, Refresh } from '@element-plus/icons-vue';
import { computed, ref, watch } from 'vue';
import type { PermissionTreeNode } from '@/utils/permission-tree';
import { PERMISSION_TYPE_META } from './permission-ui';

interface PermissionDirectoryRow extends PermissionTreeNode {
  depth: number;
}

const props = defineProps<{
  tree: PermissionTreeNode[];
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  create: [prefix: string];
  edit: [node: PermissionTreeNode];
  remove: [node: PermissionTreeNode];
}>();

const expandedIds = ref(new Set<string>());
const rows = computed(() => flattenRows(props.tree));

watch(
  () => props.tree,
  () => {
    expandedIds.value = new Set();
  },
);

function flattenRows(nodes: PermissionTreeNode[], depth = 0): PermissionDirectoryRow[] {
  return nodes.flatMap((node) => {
    const row = { ...node, depth };
    if (!expandedIds.value.has(node.id)) {
      return [row];
    }
    return [row, ...flattenRows(node.children, depth + 1)];
  });
}

function rowStyle(row: PermissionDirectoryRow): Record<string, string> {
  return {
    '--permission-depth': String(row.depth),
  };
}

function isExpanded(row: PermissionTreeNode): boolean {
  return expandedIds.value.has(row.id);
}

function toggle(row: PermissionTreeNode): void {
  if (!row.children.length) {
    return;
  }
  const next = new Set(expandedIds.value);
  if (next.has(row.id)) {
    next.delete(row.id);
  } else {
    next.add(row.id);
  }
  expandedIds.value = next;
}

function permissionTypeClass(node: PermissionTreeNode): string {
  return node.permission ? `is-${PERMISSION_TYPE_META[node.permission.type].tone}` : 'is-group';
}

function permissionTypeLabel(node: PermissionTreeNode): string {
  return node.permission ? PERMISSION_TYPE_META[node.permission.type].label : '分组';
}

function nodeDetail(node: PermissionTreeNode): string {
  const permission = node.permission;
  if (!permission) {
    return node.children.length ? `${node.children.length} 个节点` : '空命名空间';
  }
  if (permission.apiMethod || permission.apiPath) {
    return [permission.apiMethod, permission.apiPath].filter(Boolean).join(' ');
  }
  if (permission.path || permission.component) {
    return [permission.path, permission.component].filter(Boolean).join(' / ');
  }
  return '暂无扩展信息';
}
</script>

<template>
  <section
    v-loading="loading"
    class="permission-panel"
  >
    <div class="permission-panel__head">
      <div>
        <span class="permission-eyebrow">Directory</span>
        <h2>权限目录</h2>
      </div>
      <div class="permission-panel__actions">
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
        <el-button
          v-permission="PERMS.permission.create"
          type="primary"
          :icon="Plus"
          @click="emit('create', '')"
        >
          新增权限
        </el-button>
      </div>
    </div>

    <div class="permission-tree-shell">
      <div
        class="permission-directory"
        role="tree"
      >
        <div
          class="permission-directory__head"
          aria-hidden="true"
        >
          <span>权限节点</span>
          <span>类型</span>
          <span>扩展信息</span>
          <span>操作</span>
        </div>
        <div
          v-for="row in rows"
          :key="row.id"
          :class="['permission-node', row.isGroup ? 'is-group' : '']"
          :style="rowStyle(row)"
          role="treeitem"
          :aria-level="row.depth + 1"
          :aria-expanded="row.children.length ? isExpanded(row) : undefined"
        >
          <div class="permission-node__main">
            <span
              class="permission-node__indent"
              aria-hidden="true"
            />
            <button
              v-if="row.children.length"
              type="button"
              :class="['permission-node__toggle', isExpanded(row) ? 'is-expanded' : '']"
              :aria-label="isExpanded(row) ? `收起 ${row.label}` : `展开 ${row.label}`"
              @click="toggle(row)"
            >
              <el-icon><ArrowRight /></el-icon>
            </button>
            <span
              v-else
              class="permission-node__toggle is-placeholder"
              aria-hidden="true"
            />
            <span class="permission-node__icon">
              <el-icon><FolderOpened /></el-icon>
            </span>
            <div class="permission-node__text">
              <strong>{{ row.label }}</strong>
              <small>{{ row.code }}</small>
            </div>
          </div>
          <div class="permission-node__meta">
            <span :class="['permission-type', permissionTypeClass(row)]">
              {{ permissionTypeLabel(row) }}
            </span>
          </div>
          <div class="permission-node__detail">
            {{ nodeDetail(row) }}
          </div>
          <div class="permission-node__actions">
            <el-button
              v-if="row.isGroup"
              v-permission="PERMS.permission.create"
              type="primary"
              link
              :icon="Plus"
              @click.stop="emit('create', row.code)"
            >
              新增子权限
            </el-button>
            <template v-else>
              <el-button
                v-permission="PERMS.permission.update"
                type="primary"
                link
                :icon="EditPen"
                @click.stop="emit('edit', row)"
              >
                编辑
              </el-button>
              <el-button
                v-permission="PERMS.permission.remove"
                type="danger"
                link
                :icon="Delete"
                @click.stop="emit('remove', row)"
              >
                删除
              </el-button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
