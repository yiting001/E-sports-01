<script setup lang="ts">
/** 首页横幅设置面板：维护多图顺序、活动绑定和自动轮播间隔。 */
import { computed, onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  PERMS,
  PORTAL_BANNER_LIMITS,
  type ActivityView,
  type PortalBannerItem,
  type PortalBannerView,
} from '@app/contracts';
import { ArrowDown, ArrowUp, Delete, Plus, Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import AppPanel from '@/components/common/AppPanel.vue';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { activityApi } from '@/api/activity.api';
import { noticeApi } from '@/api/notice.api';
import { useAuthStore } from '@/stores/auth.store';

interface EditableBannerItem extends PortalBannerItem {
  key: string;
}

const auth = useAuthStore();
const items = ref<EditableBannerItem[]>([]);
const activities = ref<ActivityView[]>([]);
const intervalSeconds = ref<number>(PORTAL_BANNER_LIMITS.defaultIntervalSeconds);
const savedSignature = ref('');
const saving = ref(false);
const loading = ref(true);
const bannerLoadFailed = ref(false);
const activitiesLoading = ref(false);
const activitiesLoadFailed = ref(false);
let nextItemKey = 0;

const canListActivities = computed(() => auth.hasPermission(PERMS.activity.list));
const currentSignature = computed(() => bannerSignature(toPayload()));
const hasChanges = computed(() => currentSignature.value !== savedSignature.value);

function toPayload(): PortalBannerView {
  return {
    items: items.value.map((item) => ({
      image: item.image.trim(),
      activityId: item.activityId.trim(),
    })),
    intervalSeconds: intervalSeconds.value,
  };
}

function bannerSignature(banner: PortalBannerView): string {
  return JSON.stringify(banner);
}

function applyBanner(banner: PortalBannerView): void {
  items.value = banner.items.map(toEditableItem);
  intervalSeconds.value = banner.intervalSeconds;
  savedSignature.value = bannerSignature(banner);
}

function toEditableItem(item: PortalBannerItem): EditableBannerItem {
  nextItemKey += 1;
  return { ...item, key: `banner-item-${nextItemKey}` };
}

async function loadBanner(): Promise<void> {
  loading.value = true;
  bannerLoadFailed.value = false;
  try {
    applyBanner(await noticeApi.getBanner());
  } catch {
    bannerLoadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

/** 活动列表沿用活动模块的租户隔离与排序，分页拉全以免已绑定活动不在首屏。 */
async function loadActivities(): Promise<void> {
  if (!canListActivities.value) {
    return;
  }
  activitiesLoading.value = true;
  activitiesLoadFailed.value = false;
  try {
    const result: ActivityView[] = [];
    let page = 1;
    let total = 0;
    do {
      const response = await activityApi.list(page, PAGINATION_DEFAULTS.maxPageSize);
      result.push(...response.list);
      total = response.total;
      page += 1;
      if (!response.list.length) {
        break;
      }
    } while (result.length < total);
    activities.value = result;
  } catch {
    activitiesLoadFailed.value = true;
  } finally {
    activitiesLoading.value = false;
  }
}

function addItem(): void {
  if (items.value.length >= PORTAL_BANNER_LIMITS.itemsMax) {
    return;
  }
  items.value.push(toEditableItem({ image: '', activityId: '' }));
}

function removeItem(index: number): void {
  items.value.splice(index, 1);
}

function moveItem(index: number, offset: -1 | 1): void {
  const target = index + offset;
  if (target < 0 || target >= items.value.length) {
    return;
  }
  const [item] = items.value.splice(index, 1);
  items.value.splice(target, 0, item);
}

function activityState(activity: ActivityView): string {
  if (!activity.enabled) {
    return '已停用';
  }
  const now = Date.now();
  if (new Date(activity.startAt).getTime() > now) {
    return '未开始';
  }
  if (new Date(activity.endAt).getTime() <= now) {
    return '已结束';
  }
  return '进行中';
}

async function save(): Promise<void> {
  if (items.value.some((item) => !item.image.trim())) {
    ElMessage.warning('请先上传每个横幅的图片，或移除空白横幅');
    return;
  }
  saving.value = true;
  try {
    const saved = await noticeApi.updateBanner(toPayload());
    applyBanner(saved);
    ElMessage.success(saved.items.length ? '首页横幅已更新' : '首页横幅已全部撤下');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadBanner();
  void loadActivities();
});
</script>

<template>
  <app-panel
    title="首页横幅"
    eyebrow="Home Banner"
    description="维护 C 端首页轮播图片及关联活动"
  >
    <template #actions>
      <el-radio-group
        v-model="intervalSeconds"
        size="small"
        aria-label="轮播间隔"
      >
        <el-radio-button
          v-for="second in [1, 2, 3]"
          :key="second"
          :value="second"
        >
          {{ second }} 秒
        </el-radio-button>
      </el-radio-group>
    </template>

    <div
      v-loading="loading"
      class="banner-panel"
    >
      <div
        v-if="items.length"
        class="banner-list"
      >
        <div
          v-for="(item, index) in items"
          :key="item.key"
          class="banner-item"
        >
          <span class="banner-item__index">{{ index + 1 }}</span>
          <image-uploader
            v-model="item.image"
            :show-url="false"
          />
          <div class="banner-item__activity">
            <span class="banner-item__label">关联活动</span>
            <el-select
              v-model="item.activityId"
              clearable
              filterable
              :loading="activitiesLoading"
              placeholder="不跳转"
            >
              <el-option
                v-for="activity in activities"
                :key="activity.id"
                :label="`${activity.title} · ${activityState(activity)}`"
                :value="activity.id"
              />
            </el-select>
          </div>
          <div class="banner-item__actions">
            <el-tooltip content="上移">
              <el-button
                circle
                :icon="ArrowUp"
                :disabled="index === 0"
                :aria-label="`上移第 ${index + 1} 张横幅`"
                @click="moveItem(index, -1)"
              />
            </el-tooltip>
            <el-tooltip content="下移">
              <el-button
                circle
                :icon="ArrowDown"
                :disabled="index === items.length - 1"
                :aria-label="`下移第 ${index + 1} 张横幅`"
                @click="moveItem(index, 1)"
              />
            </el-tooltip>
            <el-tooltip content="删除">
              <el-button
                circle
                type="danger"
                :icon="Delete"
                :aria-label="`删除第 ${index + 1} 张横幅`"
                @click="removeItem(index)"
              />
            </el-tooltip>
          </div>
        </div>
      </div>

      <el-empty
        v-else-if="!loading && !bannerLoadFailed"
        :image-size="72"
        description="暂无首页横幅"
      />

      <div
        v-if="bannerLoadFailed"
        class="banner-panel__warning"
      >
        <span>横幅配置加载失败</span>
        <el-button
          link
          type="primary"
          :icon="Refresh"
          :loading="loading"
          @click="loadBanner"
        >
          重试
        </el-button>
      </div>

      <div
        v-if="!canListActivities || activitiesLoadFailed"
        class="banner-panel__warning"
      >
        <span>{{ canListActivities ? '活动列表加载失败' : '当前账号无活动列表权限' }}</span>
        <el-button
          v-if="canListActivities"
          link
          type="primary"
          :icon="Refresh"
          :loading="activitiesLoading"
          @click="loadActivities"
        >
          重试
        </el-button>
      </div>

      <div
        v-if="!bannerLoadFailed"
        class="banner-panel__footer"
      >
        <el-button
          :icon="Plus"
          :disabled="items.length >= PORTAL_BANNER_LIMITS.itemsMax"
          @click="addItem"
        >
          添加横幅
        </el-button>
        <el-button
          v-permission="PERMS.notice.banner"
          type="primary"
          :loading="saving"
          :disabled="!hasChanges"
          @click="save"
        >
          保存
        </el-button>
      </div>
    </div>
  </app-panel>
</template>

<style scoped>
.banner-panel,
.banner-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.banner-item {
  display: grid;
  grid-template-columns: 28px 120px minmax(220px, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-bottom: 1px solid var(--app-border-color);
}

.banner-item__index {
  color: var(--app-text-muted);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.banner-item__activity {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.banner-item__label {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.banner-item__actions,
.banner-panel__footer,
.banner-panel__warning {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-item__actions {
  flex-wrap: nowrap;
}

.banner-panel__warning {
  color: var(--el-color-warning);
  font-size: 12px;
}

.banner-panel__footer {
  justify-content: flex-end;
  padding-top: 4px;
}

@media (max-width: 760px) {
  .banner-item {
    grid-template-columns: 28px 120px minmax(0, 1fr);
  }

  .banner-item__actions {
    grid-column: 2 / -1;
    justify-content: flex-end;
  }
}
</style>
