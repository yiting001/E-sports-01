<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useMenus } from '@/composables/use-menus';

const auth = useAuthStore();
const { menus } = useMenus();

const cards = computed(() => [
  { label: '当前用户', value: auth.profile?.nickname || auth.profile?.username || '-' },
  { label: '角色数', value: auth.profile?.roles.length ?? 0 },
  { label: '权限点', value: auth.profile?.permissions.length ?? 0 },
  { label: '可见菜单', value: menus.value.length },
]);
</script>

<template>
  <div>
    <el-row :gutter="16">
      <el-col
        v-for="card in cards"
        :key="card.label"
        :span="6"
      >
        <el-card>
          <div class="metric-label">
            {{ card.label }}
          </div>
          <div class="metric-value">
            {{ card.value }}
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-card class="intro">
      <p>欢迎使用基础设施平台。本平台提供配置中心、RBAC 权限、文件上传、WebSocket 即时通讯四大基础能力。</p>
      <p>左侧菜单根据你的权限动态显示，按钮级操作由 v-permission 指令控制。</p>
    </el-card>
  </div>
</template>

<style scoped>
.metric-label {
  color: #909399;
  font-size: 13px;
}
.metric-value {
  font-size: 28px;
  font-weight: 600;
  margin-top: 8px;
}
.intro {
  margin-top: 16px;
  line-height: 1.8;
}
</style>
