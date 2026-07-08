<script setup lang="ts">
/**
 * 领取记录抽屉：某券的领取明细分页（哪个用户领了、经哪个分发人、何时领取）。
 */
import { ref, watch } from 'vue';
import {
  PAGINATION_DEFAULTS,
  type CouponClaimRecordView,
} from '@app/contracts';
import { couponApi } from '@/api/coupon.api';
import { couponDateText } from './coupon-admin.format';

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ couponId: string; couponTitle: string }>();

const list = ref<CouponClaimRecordView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await couponApi.claims(props.couponId, page.value, pageSize.value);
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

watch(visible, (value) => {
  if (value) {
    page.value = PAGINATION_DEFAULTS.page;
    void load();
  }
});
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="`领取记录 - ${props.couponTitle}`"
    size="640px"
    class="admin-drawer"
    destroy-on-close
  >
    <el-table
      v-loading="loading"
      :data="list"
      empty-text="暂无领取记录"
    >
      <el-table-column
        label="领取用户"
        min-width="160"
      >
        <template #default="{ row }">
          <span>{{ row.nickname }}</span>
          <span class="claims-muted">（{{ row.username }}）</span>
        </template>
      </el-table-column>
      <el-table-column
        label="分发人"
        min-width="120"
      >
        <template #default="{ row }">
          <span v-if="row.distributorName">{{ row.distributorName }}</span>
          <span
            v-else
            class="claims-muted"
          >领券中心自领</span>
        </template>
      </el-table-column>
      <el-table-column
        label="领取时间"
        min-width="150"
      >
        <template #default="{ row }">
          {{ couponDateText(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <div class="claims-pager">
      <el-pagination
        layout="total, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="changePage"
      />
    </div>
  </el-drawer>
</template>

<style scoped>
.claims-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.claims-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
