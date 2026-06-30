<script setup lang="ts">
import type { MenuItem } from '@/composables/use-menus';

defineProps<{
  menus: MenuItem[];
  activePath: string;
}>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<template>
  <el-menu
    :default-active="activePath"
    class="app-menu"
    router
    @select="emit('select')"
  >
    <template
      v-for="item in menus"
      :key="item.key"
    >
      <el-sub-menu
        v-if="item.children"
        :index="item.key"
      >
        <template #title>
          <el-icon v-if="item.icon">
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.title }}</span>
        </template>
        <el-menu-item
          v-for="child in item.children"
          :key="child.key"
          :index="child.path"
        >
          <el-icon v-if="child.icon">
            <component :is="child.icon" />
          </el-icon>
          <span>{{ child.title }}</span>
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item
        v-else
        :index="item.path"
      >
        <el-icon v-if="item.icon">
          <component :is="item.icon" />
        </el-icon>
        <span>{{ item.title }}</span>
      </el-menu-item>
    </template>
  </el-menu>
</template>
