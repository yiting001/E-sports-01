<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Key, Menu, Monitor, UserFilled } from '@element-plus/icons-vue';
import { PERMS, STATS_RANGE_TEXT, StatsRange } from '@app/contracts';
import AppPanel from '@/components/common/AppPanel.vue';
import AppStats from '@/components/common/AppStats.vue';
import OrderStatsPanel from '@/components/dashboard/OrderStatsPanel.vue';
import FinanceStatsPanel from '@/components/dashboard/FinanceStatsPanel.vue';
import UserStatsPanel from '@/components/dashboard/UserStatsPanel.vue';
import BoosterStatsPanel from '@/components/dashboard/BoosterStatsPanel.vue';
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

type StatsTabKey = 'orders' | 'finance' | 'users' | 'boosters';

const router = useRouter();
const auth = useAuthStore();
const { menus } = useMenus();

/** 统计时间范围（日/月/年），各统计块共用 */
const statsRange = ref(StatsRange.Day);
const rangeOptions = Object.values(StatsRange);
const activeStatsTab = ref<StatsTabKey>('orders');

/** 按当前账号权限决定可见的统计块 */
const statsBlocks = computed(() => ({
  orders: auth.hasPermission(PERMS.dashboard.orders),
  finance: auth.hasPermission(PERMS.dashboard.finance),
  users: auth.hasPermission(PERMS.dashboard.users),
  boosters: auth.hasPermission(PERMS.dashboard.boosters),
}));
const hasStats = computed(() => Object.values(statsBlocks.value).some(Boolean));
const visibleStatsTabs = computed(() =>
  [
    { name: 'orders' as const, label: '订单运营', visible: statsBlocks.value.orders },
    { name: 'finance' as const, label: '财务资金', visible: statsBlocks.value.finance },
    { name: 'users' as const, label: '用户增长', visible: statsBlocks.value.users },
    { name: 'boosters' as const, label: '打手生态', visible: statsBlocks.value.boosters },
  ].filter((item) => item.visible),
);

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
    value: auth.profile?.isSuper ? '全部' : permissionCount.value,
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

watch(
  visibleStatsTabs,
  (tabs) => {
    if (!tabs.some((item) => item.name === activeStatsTab.value)) {
      activeStatsTab.value = tabs[0]?.name ?? 'orders';
    }
  },
  { immediate: true },
);

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
    <section class="dashboard-overview">
      <app-stats
        class="dashboard-overview__stats"
        :items="metrics"
      />

      <div class="dashboard-account">
        <span class="dashboard-account__avatar">
          <el-icon><UserFilled /></el-icon>
        </span>
        <div>
          <strong>{{ profileName }}</strong>
          <small>{{ auth.profile?.isSuper ? '超级管理员账号' : '授权账号' }}</small>
        </div>
        <el-tag
          round
          type="success"
          effect="light"
        >
          正常
        </el-tag>
      </div>
    </section>

    <app-panel
      v-if="hasStats"
      class="dashboard-analytics"
      title="经营数据"
      eyebrow="Analytics"
      description="按角色权限展示订单、财务、用户与打手统计，时间范围统一切换。"
    >
      <template #actions>
        <el-radio-group
          v-model="statsRange"
          size="small"
        >
          <el-radio-button
            v-for="option in rangeOptions"
            :key="option"
            :value="option"
          >
            {{ STATS_RANGE_TEXT[option] }}
          </el-radio-button>
        </el-radio-group>
      </template>

      <el-tabs
        v-model="activeStatsTab"
        class="dashboard-tabs"
      >
        <el-tab-pane
          v-if="statsBlocks.orders"
          label="订单运营"
          name="orders"
        >
          <order-stats-panel :range="statsRange" />
        </el-tab-pane>
        <el-tab-pane
          v-if="statsBlocks.finance"
          label="财务资金"
          name="finance"
        >
          <finance-stats-panel :range="statsRange" />
        </el-tab-pane>
        <el-tab-pane
          v-if="statsBlocks.users"
          label="用户增长"
          name="users"
        >
          <user-stats-panel :range="statsRange" />
        </el-tab-pane>
        <el-tab-pane
          v-if="statsBlocks.boosters"
          label="打手生态"
          name="boosters"
        >
          <booster-stats-panel :range="statsRange" />
        </el-tab-pane>
      </el-tabs>
    </app-panel>

    <app-panel
      v-else
      title="经营数据"
      eyebrow="Analytics"
    >
      <div class="empty-state">当前账号暂无仪表盘统计权限</div>
    </app-panel>

    <section class="dashboard-workspace">
      <app-panel
        class="dashboard-module-panel"
        title="业务入口"
        eyebrow="Modules"
      >
        <template #actions>
          <span class="admin-muted">{{ leafMenus.length }} 个入口</span>
        </template>
        <div class="module-list">
          <button
            v-for="item in modules"
            :key="item.key"
            class="module-row"
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

      <app-panel
        class="access-panel"
        title="访问概览"
        eyebrow="Access"
      >
        <template #actions>
          <el-icon><Key /></el-icon>
        </template>
        <div class="access-section">
          <div class="access-section__title">
            <el-icon><UserFilled /></el-icon>
            <span>角色</span>
          </div>
          <div class="role-list">
            <span
              v-for="role in roleSummary"
              :key="role"
            >
              {{ role }}
            </span>
          </div>
        </div>
        <div class="access-section">
          <div class="access-section__title">
            <el-icon><Monitor /></el-icon>
            <span>权限分布</span>
          </div>
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
              {{ auth.profile?.isSuper ? '超级管理员内置全权限' : '暂无权限点' }}
            </div>
          </div>
        </div>
      </app-panel>
    </section>
  </section>
</template>
