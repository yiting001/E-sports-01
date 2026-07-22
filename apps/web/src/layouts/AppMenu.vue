<script setup lang="ts">
import type { MenuItem } from "@/composables/use-menus";

const props = defineProps<{
  menus: MenuItem[];
  activePath: string;
  badgeCounts: Readonly<Partial<Record<string, number>>>;
}>();

const emit = defineEmits<{
  select: [];
}>();

function badgeCount(key: string): number {
  return props.badgeCounts[key] ?? 0;
}
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
          <el-badge
            :value="badgeCount(child.key)"
            :max="99"
            :hidden="badgeCount(child.key) === 0"
            class="app-menu__label"
          >
            <span class="app-menu__title">{{ child.title }}</span>
          </el-badge>
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item
        v-else
        :index="item.path"
      >
        <el-icon v-if="item.icon">
          <component :is="item.icon" />
        </el-icon>
        <el-badge
          :value="badgeCount(item.key)"
          :max="99"
          :hidden="badgeCount(item.key) === 0"
          class="app-menu__label"
        >
          <span class="app-menu__title">{{ item.title }}</span>
        </el-badge>
      </el-menu-item>
    </template>
  </el-menu>
</template>
