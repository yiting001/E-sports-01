<script setup lang="ts">
/**
 * 税务管理页（菜单 finance:tax:menu，财务分组）。
 * 可视化编辑提现阶梯税费（配置中心 wallet.withdrawTaxTiers）：
 * 按「起始金额（元）→ 税费率（%）」增删改档位，提现金额命中「起始金额 ≤ 金额」的最高档；
 * 无档位命中或未配置阶梯时回退单一费率 wallet.withdrawFeeRateBp。
 */
import { computed, onMounted, ref } from 'vue';
import {
  FEE_RATE_BASE,
  PERMS,
  WITHDRAW_TAX_TIERS_MAX,
  fenToYuan,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Plus, Refresh } from '@element-plus/icons-vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { financeApi } from '@/api/finance.api';
import './TaxConfigAdminView.css';

/** 编辑行：金额以元、费率以 % 呈现，保存时换算回分/万分比 */
interface TierRow {
  minYuan: number;
  ratePct: number;
}

const rows = ref<TierRow[]>([]);
const fallbackRateBp = ref(0);
const loading = ref(false);
const saving = ref(false);
const loadFailed = ref(false);

const fallbackRatePct = computed(() => (fallbackRateBp.value / FEE_RATE_BASE) * 100);

function toRow(minFen: number, rateBp: number): TierRow {
  return {
    minYuan: minFen / 100,
    ratePct: (rateBp / FEE_RATE_BASE) * 100,
  };
}

function rangeText(index: number): string {
  const start = rows.value[index].minYuan;
  const next = rows.value
    .map((row, i) => ({ row, i }))
    .filter(({ row, i }) => i !== index && row.minYuan > start)
    .reduce<number | null>(
      (min, { row }) => (min === null || row.minYuan < min ? row.minYuan : min),
      null,
    );
  return next === null ? `≥ ¥${start}` : `¥${start} ~ ¥${next}（不含）`;
}

async function load(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    const config = await financeApi.getTaxConfig();
    rows.value = config.tiers.map((tier) => toRow(tier.minFen, tier.rateBp));
    fallbackRateBp.value = config.fallbackRateBp;
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

function addRow(): void {
  if (rows.value.length >= WITHDRAW_TAX_TIERS_MAX) {
    ElMessage.warning(`最多 ${WITHDRAW_TAX_TIERS_MAX} 个档位`);
    return;
  }
  const maxMin = rows.value.reduce((max, row) => Math.max(max, row.minYuan), 0);
  rows.value.push({ minYuan: rows.value.length === 0 ? 0 : maxMin + 100, ratePct: 0 });
}

function removeRow(index: number): void {
  rows.value.splice(index, 1);
}

function validate(): string | null {
  const seen = new Set<number>();
  for (const row of rows.value) {
    const minFen = Math.round(row.minYuan * 100);
    if (seen.has(minFen)) {
      return '档位起始金额不能重复';
    }
    seen.add(minFen);
  }
  return null;
}

async function save(): Promise<void> {
  const error = validate();
  if (error) {
    ElMessage.warning(error);
    return;
  }
  try {
    await ElMessageBox.confirm(
      rows.value.length === 0
        ? `将清空全部阶梯档位，提现税费回退单一费率 ${fallbackRatePct.value}%，确认保存？`
        : `保存后立即对新提现申请生效（共 ${rows.value.length} 档），确认保存？`,
      '保存税务配置',
      { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    const config = await financeApi.saveTaxConfig({
      tiers: rows.value.map((row) => ({
        minFen: Math.round(row.minYuan * 100),
        rateBp: Math.round((row.ratePct / 100) * FEE_RATE_BASE),
      })),
    });
    rows.value = config.tiers.map((tier) => toRow(tier.minFen, tier.rateBp));
    fallbackRateBp.value = config.fallbackRateBp;
    ElMessage.success('税务配置已保存');
  } finally {
    saving.value = false;
  }
}

function previewFee(row: TierRow): string {
  const amountFen = Math.round(row.minYuan * 100) || 10000;
  const rateBp = Math.round((row.ratePct / 100) * FEE_RATE_BASE);
  const feeFen = Math.ceil((amountFen * rateBp) / FEE_RATE_BASE);
  return `¥${fenToYuan(amountFen)} 提现，税费 ¥${fenToYuan(feeFen)}`;
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page tax-config-page">
    <app-panel
      title="税务管理"
      eyebrow="Withdraw Tax"
      description="可视化配置提现阶梯税费：提现金额命中「起始金额 ≤ 金额」的最高档费率；无档位命中时回退单一费率"
    >
      <template #actions>
        <div class="admin-actions">
          <el-button
            v-permission="PERMS.finance.taxSave"
            type="primary"
            :loading="saving"
            @click="save"
          >
            保存配置
          </el-button>
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
        </div>
      </template>

      <el-alert
        class="tax-config-hint"
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          未命中任何档位时按单一费率 {{ fallbackRatePct }}% 计税（配置中心
          wallet.withdrawFeeRateBp）；税费从提现金额中扣除，向上取整到分。
        </template>
      </el-alert>

      <el-alert
        v-if="loadFailed"
        class="tax-config-hint"
        type="error"
        :closable="false"
        show-icon
      >
        <template #title>
          税务配置加载失败，请
          <el-button
            link
            type="primary"
            @click="load"
          >
            重试
          </el-button>
        </template>
      </el-alert>

      <el-table
        v-loading="loading"
        :data="rows"
        size="default"
        class="tax-config-table"
        empty-text="暂无阶梯档位，将按单一费率计税"
      >
        <el-table-column
          label="#"
          width="50"
        >
          <template #default="{ $index }">
            {{ $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          label="起始金额（元，含）"
          min-width="180"
        >
          <template #default="{ row }">
            <el-input-number
              v-model="row.minYuan"
              :min="0"
              :precision="2"
              :step="100"
              controls-position="right"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="税费率（%）"
          min-width="160"
        >
          <template #default="{ row }">
            <el-input-number
              v-model="row.ratePct"
              :min="0"
              :max="100"
              :precision="2"
              :step="0.5"
              controls-position="right"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="适用区间"
          min-width="170"
        >
          <template #default="{ $index }">
            <span class="tax-config-muted">{{ rangeText($index) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="示例"
          min-width="200"
        >
          <template #default="{ row }">
            <span class="tax-config-muted">{{ previewFee(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label=""
          width="60"
        >
          <template #default="{ $index }">
            <el-button
              v-permission="PERMS.finance.taxSave"
              link
              type="danger"
              :icon="Delete"
              @click="removeRow($index)"
            />
          </template>
        </el-table-column>
      </el-table>

      <el-button
        v-permission="PERMS.finance.taxSave"
        class="tax-config-add"
        :icon="Plus"
        @click="addRow"
      >
        新增档位
      </el-button>
    </app-panel>
  </section>
</template>
