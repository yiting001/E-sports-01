<script setup lang="ts">
/**
 * 打手等级档位配置抽屉（booster:level:set）。
 * 表格式编辑：等级名称 / 完成单数门槛 / 提成万分比，支持增删行；
 * 保存后立即对定级与订单完成结算生效。
 */
import { ref, watch } from 'vue';
import {
  BOOSTER_LEVEL_LIMITS,
  FEE_RATE_BASE,
  type BoosterLevelTier,
} from '@app/contracts';
import { ElMessage } from 'element-plus';
import { Delete, Plus } from '@element-plus/icons-vue';
import { boosterApi } from '@/api/booster.api';

const visible = defineModel<boolean>({ required: true });

const tiers = ref<BoosterLevelTier[]>([]);
const loading = ref(false);
const saving = ref(false);

watch(visible, (open) => {
  if (open) {
    void load();
  }
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    tiers.value = await boosterApi.getLevels();
  } finally {
    loading.value = false;
  }
}

function addTier(): void {
  if (tiers.value.length >= BOOSTER_LEVEL_LIMITS.tiersMax) {
    ElMessage.warning(`最多 ${BOOSTER_LEVEL_LIMITS.tiersMax} 个档位`);
    return;
  }
  tiers.value.push({
    level: tiers.value.length + 1,
    name: '',
    minCompletedOrders: 0,
    commissionRateBp: 0,
  });
}

function removeTier(index: number): void {
  tiers.value.splice(index, 1);
}

async function save(): Promise<void> {
  if (tiers.value.length === 0) {
    ElMessage.warning('至少保留一个档位');
    return;
  }
  if (tiers.value.some((tier) => !tier.name.trim())) {
    ElMessage.warning('等级名称不能为空');
    return;
  }
  saving.value = true;
  try {
    tiers.value = await boosterApi.setLevels(tiers.value);
    ElMessage.success('等级档位已保存');
    visible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    title="打手等级档位配置"
    size="720px"
    class="admin-drawer booster-level-drawer"
    destroy-on-close
  >
    <p class="booster-muted">
      按累计完成单数自动定级，提成为订单实付金额的万分比（{{ FEE_RATE_BASE }} = 100%）。
    </p>
    <el-table
      v-loading="loading"
      :data="tiers"
      size="small"
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
        label="等级名称"
        min-width="130"
      >
        <template #default="{ row }">
          <el-input
            v-model="row.name"
            :maxlength="BOOSTER_LEVEL_LIMITS.nameMax"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="完成单数门槛"
        min-width="140"
      >
        <template #default="{ row }">
          <el-input-number
            v-model="row.minCompletedOrders"
            :min="0"
            :step="1"
            controls-position="right"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="提成（万分比）"
        min-width="140"
      >
        <template #default="{ row }">
          <el-input-number
            v-model="row.commissionRateBp"
            :min="0"
            :max="FEE_RATE_BASE"
            :step="100"
            controls-position="right"
          />
        </template>
      </el-table-column>
      <el-table-column
        label=""
        width="60"
      >
        <template #default="{ $index }">
          <el-button
            link
            type="danger"
            :icon="Delete"
            @click="removeTier($index)"
          />
        </template>
      </el-table-column>
    </el-table>
    <el-button
      class="booster-level-add"
      :icon="Plus"
      @click="addTier"
    >
      新增档位
    </el-button>
    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="visible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
