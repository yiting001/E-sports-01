<script setup lang="ts">
/**
 * 优惠券管理页：券模板 CRUD。
 * 管理端配置满减/折扣券（门槛/库存/限领/有效期），
 * C 端领券中心领取、下单结算抵扣；已领出的用户券为快照，改券不影响。
 */
import { onMounted, reactive, ref } from 'vue';
import {
  CouponType,
  PAGINATION_DEFAULTS,
  PERMS,
  type CouponView,
  type UpsertCouponPayload,
} from '@app/contracts';
import { Delete, EditPen, Plus, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import CouponFormDialog from '@/components/coupon/CouponFormDialog.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { couponApi } from '@/api/coupon.api';

type CouponTagType = 'success' | 'warning';

const COUPON_TYPE_META: Record<
  CouponType,
  { label: string; type: CouponTagType }
> = {
  [CouponType.Fixed]: { label: '满减', type: 'success' },
  [CouponType.Percent]: { label: '折扣', type: 'warning' },
};

const list = ref<CouponView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref('');
const form = reactive<UpsertCouponPayload>(emptyForm());

function emptyForm(): UpsertCouponPayload {
  return {
    title: '',
    type: CouponType.Fixed,
    value: 0,
    thresholdFen: 0,
    totalCount: 100,
    perUserLimit: 1,
    validFrom: '',
    validTo: '',
    enabled: true,
  };
}

/** 券面文案：满减 → 满 X 减 Y；折扣 → 满 X 可打 Z 折 */
function faceText(row: CouponView): string {
  const threshold =
    row.thresholdFen > 0 ? `满${row.thresholdFen / 100}元` : '无门槛';
  if (row.type === CouponType.Fixed) {
    return `${threshold}减${row.value / 100}元`;
  }
  return `${threshold}打${row.value / 1000}折`;
}

function couponTypeMeta(row: CouponView): { label: string; type: CouponTagType } {
  return COUPON_TYPE_META[row.type];
}

function usagePercent(row: CouponView): number {
  if (row.totalCount <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((row.issuedCount / row.totalCount) * 100));
}

function remainingCount(row: CouponView): number {
  return Math.max(row.totalCount - row.issuedCount, 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await couponApi.list(page.value, pageSize.value);
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function changePage(value: number): Promise<void> {
  page.value = value;
  await load();
}

async function changePageSize(value: number): Promise<void> {
  pageSize.value = value;
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

function openCreate(): void {
  editingId.value = '';
  Object.assign(form, emptyForm());
  dialogVisible.value = true;
}

function openEdit(row: CouponView): void {
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title,
    type: row.type,
    value: row.value,
    thresholdFen: row.thresholdFen,
    totalCount: row.totalCount,
    perUserLimit: row.perUserLimit,
    validFrom: row.validFrom,
    validTo: row.validTo,
    enabled: row.enabled,
  });
  dialogVisible.value = true;
}

function updateForm(value: UpsertCouponPayload): void {
  Object.assign(form, value);
}

async function submit(): Promise<void> {
  if (!form.title.trim()) {
    ElMessage.warning('券名必填');
    return;
  }
  if (form.value <= 0) {
    ElMessage.warning('面值须大于 0');
    return;
  }
  if (!form.validFrom || !form.validTo) {
    ElMessage.warning('请选择有效期');
    return;
  }
  submitting.value = true;
  try {
    const payload: UpsertCouponPayload = { ...form, title: form.title.trim() };
    if (editingId.value) {
      await couponApi.update(editingId.value, payload);
      ElMessage.success('已保存');
    } else {
      await couponApi.create(payload);
      ElMessage.success('已发布');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

async function remove(row: CouponView): Promise<void> {
  await ElMessageBox.confirm(`确认删除优惠券「${row.title}」？`, '提示', {
    type: 'warning',
  });
  await couponApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <section class="admin-page coupon-page">
    <app-panel
      title="优惠券"
      eyebrow="Coupons"
      description="配置满减/折扣券，C 端领券中心领取，下单结算时抵扣"
    >
      <template #actions>
        <div class="admin-actions">
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
          <el-button
            v-permission="PERMS.coupon.save"
            type="primary"
            :icon="Plus"
            @click="openCreate"
          >
            新建优惠券
          </el-button>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="960"
        empty-text="暂无优惠券"
      >
        <el-table-column
          label="券信息"
          min-width="220"
        >
          <template #default="{ row }">
            <div class="coupon-info">
              <span class="coupon-info__title">{{ row.title }}</span>
              <el-tag
                size="small"
                :type="couponTypeMeta(row).type"
              >
                {{ couponTypeMeta(row).label }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="券面"
          min-width="180"
        >
          <template #default="{ row }">
            <span class="coupon-face">{{ faceText(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="领取进度"
          width="180"
        >
          <template #default="{ row }">
            <div class="coupon-progress">
              <div class="coupon-progress__text">
                <span>{{ row.issuedCount }} / {{ row.totalCount }}</span>
                <span class="coupon-muted">剩余 {{ remainingCount(row) }}</span>
              </div>
              <el-progress
                :percentage="usagePercent(row)"
                :show-text="false"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="限领"
          width="90"
        >
          <template #default="{ row }">
            {{ row.perUserLimit }} 张/人
          </template>
        </el-table-column>
        <el-table-column
          label="有效期"
          min-width="240"
        >
          <template #default="{ row }">
            <div class="coupon-time">
              <span>开始：{{ formatDate(row.validFrom) }}</span>
              <span>结束：{{ formatDate(row.validTo) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="上架"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.enabled ? 'success' : 'info'"
            >
              {{ row.enabled ? '上架中' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="150"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-permission="PERMS.coupon.save"
              link
              type="primary"
              :icon="EditPen"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.coupon.remove"
              link
              type="danger"
              :icon="Delete"
              @click="remove(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="coupon-muted">共 {{ total }} 张券</span>
        <el-pagination
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[...PAGE_SIZE_OPTIONS]"
          @size-change="changePageSize"
          @current-change="changePage"
        />
      </div>
    </app-panel>

    <coupon-form-dialog
      v-model="dialogVisible"
      :form="form"
      :is-edit="Boolean(editingId)"
      :submitting="submitting"
      @update:form="updateForm"
      @submit="submit"
    />
  </section>
</template>

<style scoped>
.coupon-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.coupon-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.coupon-info,
.coupon-progress__text,
.coupon-time {
  display: flex;
  min-width: 0;
}

.coupon-info {
  align-items: center;
  gap: 8px;
}

.coupon-info__title {
  overflow: hidden;
  color: var(--app-text-color);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-face {
  color: var(--app-text-color);
  font-weight: 600;
}

.coupon-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coupon-progress__text {
  justify-content: space-between;
  gap: 8px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.coupon-time {
  flex-direction: column;
  gap: 4px;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
