<script setup lang="ts">
import type { PermissionNode } from '@app/contracts';
import { onMounted, ref } from 'vue';
import { permissionApi } from '@/api/permission.api';

const tree = ref<PermissionNode[]>([]);
const loading = ref(false);

const treeProps = { children: 'children', label: 'name' } as const;

async function load(): Promise<void> {
  loading.value = true;
  try {
    tree.value = await permissionApi.tree();
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <el-card v-loading="loading">
    <el-tree
      :data="tree"
      :props="treeProps"
      node-key="id"
      default-expand-all
    >
      <template #default="{ data }">
        <span class="node">
          <span>{{ data.name }}</span>
          <el-tag
            size="small"
            class="type"
          >{{ data.type }}</el-tag>
          <span class="code">{{ data.code }}</span>
        </span>
      </template>
    </el-tree>
  </el-card>
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
.type {
  text-transform: uppercase;
}
</style>
