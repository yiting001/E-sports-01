<script setup lang="ts">
/**
 * 邀请管理页：邀请奖励配置 + 邀请记录。
 * 奖励配置分邀请人/被邀请人两侧（不发放/优惠券/钱包金额），另支持邀请规则富文本编辑（C 端邀请页展示），落配置中心即时生效；
 * 邀请记录展示邀请双方与奖励发放结果快照。
 */
import { onMounted, ref } from 'vue';
import {
  InviteRewardType,
  PAGINATION_DEFAULTS,
  PERMS,
  type CouponView,
  type InviteConfigView,
  type InviteRecordAdminView,
} from '@app/contracts';
import { Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import InviteRewardConfigForm from '@/components/invite/InviteRewardConfigForm.vue';
import RichTextEditor from '@/components/common/RichTextEditor.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { couponApi } from '@/api/coupon.api';
import { inviteApi } from '@/api/invite.api';

function emptyConfig(): InviteConfigView {
  const side = {
    rewardType: InviteRewardType.None,
    couponId: '',
    amountFen: 0,
  };
  return { inviter: { ...side }, invitee: { ...side }, rulesHtml: '' };
}

const config = ref<InviteConfigView>(emptyConfig());
const coupons = ref<CouponView[]>([]);
const saving = ref(false);

const records = ref<InviteRecordAdminView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function loadConfig(): Promise<void> {
  const [cfg, couponPage] = await Promise.all([
    inviteApi.getConfig(),
    couponApi.list(1, PAGINATION_DEFAULTS.maxPageSize),
  ]);
  config.value = cfg;
  coupons.value = couponPage.list.filter((c) => c.enabled);
}

async function saveConfig(): Promise<void> {
  saving.value = true;
  try {
    await inviteApi.saveConfig(config.value);
    ElMessage.success('奖励配置已保存');
  } finally {
    saving.value = false;
  }
}

async function loadRecords(): Promise<void> {
  loading.value = true;
  try {
    const res = await inviteApi.records(page.value, pageSize.value);
    records.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function changePage(value: number): Promise<void> {
  page.value = value;
  await loadRecords();
}

async function changePageSize(value: number): Promise<void> {
  pageSize.value = value;
  page.value = PAGINATION_DEFAULTS.page;
  await loadRecords();
}

onMounted(async () => {
  await Promise.all([loadConfig(), loadRecords()]);
});
</script>

<template>
  <section class="admin-page invite-page">
    <app-panel
      title="邀请奖励配置"
      eyebrow="Invite Rewards"
      description="好友填码绑定成功后，按此配置向邀请人/被邀请人发放奖励，保存即时生效"
    >
      <template #actions>
        <el-button
          v-permission="PERMS.invite.configSet"
          type="primary"
          :loading="saving"
          @click="saveConfig"
        >
          保存配置
        </el-button>
      </template>

      <div class="config-row">
        <invite-reward-config-form
          v-model:config="config.inviter"
          label="邀请人奖励"
          :coupons="coupons"
        />
        <invite-reward-config-form
          v-model:config="config.invitee"
          label="被邀请人奖励"
          :coupons="coupons"
        />
      </div>

      <div class="rules-block">
        <h3 class="rules-title">
          邀请规则（C 端邀请页展示，留空则不展示）
        </h3>
        <rich-text-editor
          v-model="config.rulesHtml"
          placeholder="邀请规则说明，支持富文本…"
        />
      </div>
    </app-panel>

    <app-panel
      title="邀请记录"
      eyebrow="Invite Records"
      description="每条记录代表一次成功的邀请绑定，奖励发放结果为绑定时快照"
    >
      <template #actions>
        <el-button
          :icon="Refresh"
          @click="loadRecords"
        >
          刷新
        </el-button>
      </template>

      <app-data-table
        :data="records"
        :loading="loading"
        :min-width="880"
        empty-text="暂无邀请记录"
      >
        <el-table-column
          label="邀请人"
          min-width="140"
          prop="inviterName"
        />
        <el-table-column
          label="被邀请人"
          min-width="140"
          prop="inviteeName"
        />
        <el-table-column
          label="邀请人奖励"
          min-width="180"
        >
          <template #default="{ row }">
            {{ row.inviterRewardText || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="被邀请人奖励"
          min-width="180"
        >
          <template #default="{ row }">
            {{ row.inviteeRewardText || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="绑定时间"
          min-width="160"
        >
          <template #default="{ row }">
            <span class="invite-muted">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="invite-muted">共 {{ total }} 条记录</span>
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
  </section>
</template>

<style scoped>
.invite-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.rules-block {
  margin-top: 16px;
}

.rules-title {
  margin: 0 0 12px;
  font-size: 14px;
}

.invite-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
