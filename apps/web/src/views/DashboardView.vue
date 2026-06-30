<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Key, Menu, Monitor, UserFilled } from '@element-plus/icons-vue';
import AppPanel from '@/components/common/AppPanel.vue';
import AppStats from '@/components/common/AppStats.vue';
import { useMenus, type MenuItem } from '@/composables/use-menus';
import { useAuthStore } from '@/stores/auth.store';
import './DashboardView.css';

interface MetricCard {
  label: string;
  value: string | number;
  helper: string;
  tone: 'teal' | 'amber' | 'rose' | 'slate';
}

interface ModuleCard {
  key: string;
  title: string;
  path?: string;
  count?: number;
  icon?: string;
  children?: MenuItem[];
}

const router = useRouter();
const auth = useAuthStore();
const { menus } = useMenus();

const profileName = computed(() => auth.profile?.nickname || auth.profile?.username || '-');
const roleNames = computed(() => auth.profile?.roles ?? []);
const permissionCount = computed(() => auth.profile?.permissions.length ?? 0);
const businessMenus = computed(() => menus.value.filter((item) => item.key !== 'dashboard'));
const leafMenus = computed(() => flattenMenus(businessMenus.value));

const metrics = computed<MetricCard[]>(() => [
  {
    label: '当前用户',
    value: profileName.value,
    helper: auth.profile?.isSuper ? '超级管理员' : '标准账号',
    tone: 'teal',
  },
  {
    label: '角色数',
    value: roleNames.value.length,
    helper: roleNames.value.length ? '已绑定角色' : '暂无角色',
    tone: 'amber',
  },
  {
    label: '权限点',
    value: permissionCount.value,
    helper: auth.profile?.isSuper ? '内置全权限' : '来自角色授权',
    tone: 'rose',
  },
  {
    label: '可见菜单',
    value: leafMenus.value.length,
    helper: businessMenus.value.length ? '按权限动态加载' : '仅工作台',
    tone: 'slate',
  },
]);

const modules = computed<ModuleCard[]>(() =>
  businessMenus.value.map((item) => ({
    key: item.key,
    title: item.title,
    path: item.path,
    icon: item.icon,
    children: item.children,
    count: item.children?.length,
  })),
);

const quickAccess = computed(() => leafMenus.value.slice(0, 6));

const permissionGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const code of auth.profile?.permissions ?? []) {
    const namespace = code.split(':')[0] || 'other';
    groups.set(namespace, (groups.get(namespace) ?? 0) + 1);
  }
  return [...groups.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
});

const roleSummary = computed(() => {
  if (!roleNames.value.length) {
    return ['当前账号尚未绑定角色'];
  }
  return roleNames.value.slice(0, 4);
});

function flattenMenus(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => (item.children?.length ? item.children : item.path ? [item] : []));
}

function openModule(item: ModuleCard | MenuItem): void {
  const target = item.path ?? item.children?.[0]?.path;
  if (target) {
    void router.push(target);
  }
}
</script>

<template>
  <section class="admin-page dashboard-page">
    <app-stats :items="metrics" />

    <section class="dashboard-layout">
      <div class="main-column">
        <app-panel
          title="业务入口"
          eyebrow="Modules"
        >
          <template #actions>
            <span class="admin-muted">{{ leafMenus.length }} 个入口可用</span>
          </template>
          <div class="module-grid">
            <button
              v-for="item in modules"
              :key="item.key"
              class="module-card"
              type="button"
              @click="openModule(item)"
            >
              <span class="module-icon">
                <el-icon><component :is="item.icon || Menu" /></el-icon>
              </span>
              <span class="module-info">
                <strong>{{ item.title }}</strong>
                <small>
                  {{ item.count ? `${item.count} 个子入口` : '直接进入' }}
                </small>
              </span>
              <el-icon class="module-arrow">
                <ArrowRight />
              </el-icon>
            </button>
          </div>
        </app-panel>

        <app-panel
          title="快捷访问"
          eyebrow="Quick Access"
        >
          <div class="quick-list">
            <button
              v-for="item in quickAccess"
              :key="item.key"
              type="button"
              class="quick-item"
              @click="openModule(item)"
            >
              <span>{{ item.title }}</span>
              <el-icon><ArrowRight /></el-icon>
            </button>
            <div
              v-if="!quickAccess.length"
              class="empty-state"
            >
              暂无可见业务入口
            </div>
          </div>
        </app-panel>
      </div>

      <aside class="side-column">
        <app-panel class="identity-panel">
          <div class="identity-avatar">
            <el-icon><UserFilled /></el-icon>
          </div>
          <h2>{{ profileName }}</h2>
          <p>{{ auth.profile?.isSuper ? '超级管理员账号' : '授权账号' }}</p>
          <div class="role-list">
            <span
              v-for="role in roleSummary"
              :key="role"
            >
              {{ role }}
            </span>
          </div>
        </app-panel>

        <app-panel
          title="权限分布"
          eyebrow="Permissions"
        >
          <template #actions>
            <el-icon><Key /></el-icon>
          </template>
          <div class="permission-list">
            <div
              v-for="group in permissionGroups"
              :key="group.name"
              class="permission-item"
            >
              <span>{{ group.name }}</span>
              <strong>{{ group.count }}</strong>
            </div>
            <div
              v-if="!permissionGroups.length"
              class="empty-state"
            >
              暂无权限点
            </div>
          </div>
        </app-panel>

        <app-panel class="health-panel">
          <div>
            <el-icon><Monitor /></el-icon>
            <span>访问状态</span>
          </div>
          <strong>正常</strong>
          <p>菜单与按钮权限已按当前账号动态加载。</p>
        </app-panel>
      </aside>
    </section>
  </section>
</template>
