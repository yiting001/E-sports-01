<script setup lang="ts">
/**
 * 会员等级配置页（菜单 member:menu，member:level:set）。
 * 表格式编辑会员档位：等级名称 / 累计消费门槛（元）/ 下单折扣（万分比），
 * 支持增删行；保存写入配置中心，立即对用户定级与下单折扣生效。
 */
import { onMounted, ref } from 'vue';
import {
  FEE_RATE_BASE,
  FEN_PER_YUAN,
  MEMBER_LEVEL_LIMITS,
  PERMS,
  type MemberLevelTier,
} from '@app/contracts';
import { ElMessage } from 'element-plus';
import { Delete, Plus, Refresh } from '@element-plus/icons-vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { memberApi } from '@/api/member.api';
import './MemberLevelAdminView.css';

const tiers = ref<MemberLevelTier[]>([]);
const loading = ref(false);
const saving = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    tiers.value = await memberApi.getLevels();
  } finally {
    loading.value = false;
  }
}

function addTier(): void {
  if (tiers.value.length >= MEMBER_LEVEL_LIMITS.tiersMax) {
    ElMessage.warning(`最多 ${MEMBER_LEVEL_LIMITS.tiersMax} 个档位`);
    return;
  }
  tiers.value.push({
    level: tiers.value.length + 1,
    name: '',
    minSpendFen: 0,
    discountBp: FEE_RATE_BASE,
  });
}

function removeTier(index: number): void {
  tiers.value.splice(index, 1);
}

function setMinSpendYuan(tier: MemberLevelTier, yuan: number): void {
  tier.minSpendFen = Math.round(yuan * FEN_PER_YUAN);
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
    tiers.value = await memberApi.setLevels(tiers.value);
    ElMessage.success('会员档位已保存');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page member-page">
    <app-panel
      title="会员等级配置"
      eyebrow="Member Levels"
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
            v-permission="PERMS.member.levelSet"
            type="primary"
            :loading="saving"
            @click="save"
          >
            保存
          </el-button>
        </div>
      </template>

      <p class="member-muted">
        用户按累计消费金额自动定级；折扣为万分比（{{ FEE_RATE_BASE }} = 不打折，9500 = 95 折），下单时按当前等级折扣计算应付金额。
      </p>

      <el-table
        v-loading="loading"
        :data="tiers"
        class="member-level-table"
      >
        <el-table-column
          label="#"
          width="60"
        >
          <template #default="{ $index }">
            Lv.{{ $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          label="等级名称"
          min-width="160"
        >
          <template #default="{ row }">
            <el-input
              v-model="row.name"
              :maxlength="MEMBER_LEVEL_LIMITS.nameMax"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="累计消费门槛（元）"
          min-width="180"
        >
          <template #default="{ row }">
            <el-input-number
              :model-value="row.minSpendFen / FEN_PER_YUAN"
              :min="0"
              :step="10"
              controls-position="right"
              @update:model-value="setMinSpendYuan(row, Number($event ?? 0))"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="下单折扣（万分比）"
          min-width="180"
        >
          <template #default="{ row }">
            <el-input-number
              v-model="row.discountBp"
              :min="1"
              :max="FEE_RATE_BASE"
              :step="100"
              controls-position="right"
            />
          </template>
        </el-table-column>
        <el-table-column
          label=""
          width="70"
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
        class="member-level-add"
        :icon="Plus"
        @click="addTier"
      >
        新增档位
      </el-button>
    </app-panel>
  </section>
</template>
