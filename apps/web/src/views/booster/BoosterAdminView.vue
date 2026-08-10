<script setup lang="ts">
/**
 * 打手管理页（菜单 booster:menu）。
 * 分页展示入驻申请（可按状态过滤），支持审核通过（自动授予 booster 角色）/
 * 驳回（填写理由），以及对申请资料、联系方式和材料图片的编辑维护；
 * 另支持等级档位配置（booster:level:set）、押金交付配置（booster:deposit:policy:set）、
 * 接单区服配置（booster:region:set）与押金退还（booster:deposit:refund）。
 */
import { onMounted, ref } from "vue";
import {
  BOOSTER_LIMITS,
  BoosterStatus,
  PAGINATION_DEFAULTS,
  PERMS,
  type BoosterView,
} from "@app/contracts";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Check,
  Close,
  Coin,
  EditPen,
  LocationInformation,
  Refresh,
  RefreshLeft,
  Search,
  Setting,
  Trophy,
  Warning,
} from "@element-plus/icons-vue";
import AppDataTable from "@/components/common/AppDataTable.vue";
import AppPanel from "@/components/common/AppPanel.vue";
import PenaltyCreateDrawer from "@/components/finance/PenaltyCreateDrawer.vue";
import { PAGE_SIZE_OPTIONS } from "@/config/pagination";
import { boosterApi } from "@/api/booster.api";
import { MENU_BADGE_CODES, useMenuBadgeStore } from "@/stores/menu-badge.store";
import BoosterLevelDialog from "./BoosterLevelDialog.vue";
import BoosterDepositPolicyDialog from "./BoosterDepositPolicyDialog.vue";
import BoosterRegionDialog from "./BoosterRegionDialog.vue";
import BoosterProfileEditDrawer from "./BoosterProfileEditDrawer.vue";
import {
  contactTypeLabel,
  genderLabel,
  serviceRegionLabel,
} from "./booster-profile";
import "./BoosterAdminView.css";

const list = ref<BoosterView[]>([]);
const menuBadges = useMenuBadgeStore();
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const statusFilter = ref<BoosterStatus | "">("");
const keyword = ref("");
const loading = ref(false);

const statusMeta: Record<
  BoosterStatus,
  { text: string; type: "info" | "warning" | "success" | "danger" }
> = {
  [BoosterStatus.None]: { text: "未申请", type: "info" },
  [BoosterStatus.Pending]: { text: "待审核", type: "warning" },
  [BoosterStatus.Approved]: { text: "已入驻", type: "success" },
  [BoosterStatus.Rejected]: { text: "已驳回", type: "danger" },
};

const statusOptions = [
  { label: "全部状态", value: "" },
  { label: "待审核", value: BoosterStatus.Pending },
  { label: "已入驻", value: BoosterStatus.Approved },
  { label: "已驳回", value: BoosterStatus.Rejected },
];

function statusDisplay(
  status: BoosterStatus
): (typeof statusMeta)[BoosterStatus] {
  return statusMeta[status];
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await boosterApi.list(
      page.value,
      pageSize.value,
      statusFilter.value || undefined,
      keyword.value.trim() || undefined
    );
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

async function onFilterChange(): Promise<void> {
  page.value = 1;
  await load();
}

async function onSearch(): Promise<void> {
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function approve(row: BoosterView): Promise<void> {
  await ElMessageBox.confirm(
    `确认通过 ${
      row.nickname || row.username
    } 的入驻申请？通过后将授予打手角色。`,
    "审核通过",
    { type: "warning" }
  );
  await boosterApi.review(row.id, { approve: true });
  ElMessage.success("已通过并授予打手角色");
  await Promise.all([load(), menuBadges.refresh([MENU_BADGE_CODES.booster])]);
}

async function reject(row: BoosterView): Promise<void> {
  const { value } = await ElMessageBox.prompt(
    `请输入驳回 ${row.nickname || row.username} 的理由`,
    "驳回申请",
    { inputPattern: /\S+/, inputErrorMessage: "驳回理由不能为空" }
  );
  await boosterApi.review(row.id, { approve: false, rejectReason: value });
  ElMessage.success("已驳回");
  await Promise.all([load(), menuBadges.refresh([MENU_BADGE_CODES.booster])]);
}

const levelDialogVisible = ref(false);
const depositPolicyVisible = ref(false);
const regionDialogVisible = ref(false);

async function refundDeposit(row: BoosterView): Promise<void> {
  await ElMessageBox.confirm(
    `确认退还 ${row.nickname || row.username} 的押金？将全额退回其钱包余额。`,
    "退还押金",
    { type: "warning" }
  );
  await boosterApi.refundDeposit(row.id);
  ElMessage.success("押金已退还");
  await load();
}

const editVisible = ref(false);
const editingBooster = ref<BoosterView | null>(null);
const penaltyVisible = ref(false);
const penaltyTarget = ref<BoosterView | null>(null);

function openEdit(row: BoosterView): void {
  editingBooster.value = row;
  editVisible.value = true;
}

function openPenalty(row: BoosterView): void {
  penaltyTarget.value = row;
  penaltyVisible.value = true;
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page booster-page">
    <app-panel
      title="打手入驻管理"
      eyebrow="Booster Onboarding"
      description="审核打手入驻申请，维护资料、等级、押金与履约状态"
    >
      <template #actions>
        <div class="admin-actions">
          <el-button
            v-permission="PERMS.booster.levelSet"
            :icon="Setting"
            @click="levelDialogVisible = true"
          >
            等级配置
          </el-button>
          <el-button
            v-permission="PERMS.booster.depositPolicySet"
            :icon="Coin"
            @click="depositPolicyVisible = true"
          >
            押金配置
          </el-button>
          <el-button
            v-permission="PERMS.booster.regionSet"
            :icon="LocationInformation"
            @click="regionDialogVisible = true"
          >
            区服配置
          </el-button>
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
        </div>
      </template>

      <template #toolbar>
        <div class="admin-toolbar">
          <el-input
            v-model="keyword"
            class="booster-search"
            clearable
            :maxlength="BOOSTER_LIMITS.directoryKeywordMax"
            :prefix-icon="Search"
            placeholder="搜索打手名称或注册手机号"
            @keyup.enter="onSearch"
            @clear="onSearch"
          />
          <el-select
            v-model="statusFilter"
            class="booster-filter"
            placeholder="按状态筛选"
            @change="onFilterChange"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value || 'all'"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button
            type="primary"
            :icon="Search"
            @click="onSearch"
          >
            搜索
          </el-button>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="1420"
        table-class="booster-table"
        empty-text="暂无入驻申请"
      >
        <el-table-column
          label="申请人"
          min-width="220"
        >
          <template #default="{ row }">
            <div class="booster-user">
              <span class="booster-user__avatar">
                <el-icon><Trophy /></el-icon>
              </span>
              <div>
                <strong>{{ row.applicantName || "未填写姓名" }}</strong>
                <small>{{ row.nickname || row.username }} ·
                  {{ row.username }}</small>
                <span>{{ genderLabel(row.gender) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="服务资料"
          min-width="310"
        >
          <template #default="{ row }">
            <div class="booster-profile">
              <div class="booster-regions">
                <el-tag
                  v-for="region in row.serviceRegions"
                  :key="region"
                  size="small"
                  effect="plain"
                >
                  {{ serviceRegionLabel(region) }}
                </el-tag>
                <span v-if="row.serviceRegions.length === 0">未选择接单区服</span>
              </div>
              <span class="booster-content">{{ row.intro || "-" }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="联系方式与材料"
          min-width="280"
        >
          <template #default="{ row }">
            <div class="booster-contact-material">
              <div class="booster-contact-material__text">
                <span>
                  {{ contactTypeLabel(row.contactType) }}：{{
                    row.contactValue || "-"
                  }}
                </span>
                <span>邀请码：{{ row.invitationCode || "未填写" }}</span>
              </div>
              <el-image
                v-if="row.materialImage"
                :src="row.materialImage"
                :preview-src-list="[row.materialImage]"
                preview-teleported
                fit="contain"
                class="booster-material-image"
                alt="申请材料"
              >
                <template #error>
                  <span class="booster-material-image__error">加载失败</span>
                </template>
              </el-image>
              <span
                v-else
                class="booster-muted"
              > 未上传材料 </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="等级与履约"
          width="180"
        >
          <template #default="{ row }">
            <div class="booster-metrics">
              <el-tag
                round
                effect="plain"
              >
                Lv.{{ row.level }} {{ row.levelName }}
              </el-tag>
              <span>完成 {{ row.completedOrders }} 单</span>
              <span>押金 ¥{{ (row.depositFen / 100).toFixed(2) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          min-width="210"
        >
          <template #default="{ row }">
            <div class="booster-state">
              <el-tag
                round
                effect="light"
                :type="statusDisplay(row.status).type"
              >
                {{ statusDisplay(row.status).text }}
              </el-tag>
              <span class="booster-muted">提交：{{ formatDate(row.createdAt) }}</span>
              <span
                v-if="row.rejectReason"
                class="booster-muted"
              >
                驳回：{{ row.rejectReason }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="260"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="row.status === BoosterStatus.Pending">
              <el-button
                v-permission="PERMS.booster.review"
                link
                type="success"
                :icon="Check"
                @click="approve(row)"
              >
                通过
              </el-button>
              <el-button
                v-permission="PERMS.booster.review"
                link
                type="danger"
                :icon="Close"
                @click="reject(row)"
              >
                驳回
              </el-button>
            </template>
            <el-button
              v-permission="PERMS.booster.update"
              link
              type="primary"
              :icon="EditPen"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === BoosterStatus.Approved"
              v-permission="PERMS.finance.penaltyCreate"
              link
              type="danger"
              :icon="Warning"
              @click="openPenalty(row)"
            >
              扣款
            </el-button>
            <el-button
              v-if="row.depositFen > 0"
              v-permission="PERMS.booster.depositRefund"
              link
              type="warning"
              :icon="RefreshLeft"
              @click="refundDeposit(row)"
            >
              退押金
            </el-button>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="booster-muted">共 {{ total }} 条申请</span>
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

    <booster-profile-edit-drawer
      v-model="editVisible"
      :booster="editingBooster"
      @saved="load"
    />

    <booster-level-dialog v-model="levelDialogVisible" />
    <booster-deposit-policy-dialog v-model="depositPolicyVisible" />
    <booster-region-dialog v-model="regionDialogVisible" />
    <penalty-create-drawer
      v-model="penaltyVisible"
      :booster-user-id="penaltyTarget?.userId"
      :booster-name="
        penaltyTarget
          ? penaltyTarget.nickname || penaltyTarget.username
          : undefined
      "
      @saved="load"
    />
  </section>
</template>
