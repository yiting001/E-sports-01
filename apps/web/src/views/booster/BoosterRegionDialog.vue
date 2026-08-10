<script setup lang="ts">
/**
 * 接单区服配置抽屉（booster:region:set）。
 * 管理端可视化维护入驻表单的区服选项（值 + 名称，可增删改），
 * 保存后立即对 C 端入驻表单选项与后端提交校验生效。
 */
import { ref, watch } from 'vue';
import {
  BOOSTER_SERVICE_REGION_LIMITS,
  type BoosterServiceRegionOption,
} from '@app/contracts';
import { Delete, Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { boosterApi } from '@/api/booster.api';

const visible = defineModel<boolean>({ required: true });

const options = ref<BoosterServiceRegionOption[]>([]);
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);

watch(visible, (open) => {
  if (open) {
    void load();
  }
});

async function load(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    const list = await boosterApi.getRegions();
    options.value = list.map((item) => ({ ...item }));
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

function addOption(): void {
  if (options.value.length >= BOOSTER_SERVICE_REGION_LIMITS.optionsMax) {
    ElMessage.warning(
      `区服选项最多 ${BOOSTER_SERVICE_REGION_LIMITS.optionsMax} 项`
    );
    return;
  }
  options.value.push({ value: '', label: '' });
}

function removeOption(index: number): void {
  options.value.splice(index, 1);
}

function validate(): boolean {
  if (options.value.length === 0) {
    ElMessage.warning('至少保留一个区服选项');
    return false;
  }
  const seen = new Set<string>();
  for (const option of options.value) {
    const value = option.value.trim();
    const label = option.label.trim();
    if (!value || !BOOSTER_SERVICE_REGION_LIMITS.valuePattern.test(value)) {
      ElMessage.warning('区服值仅允许小写字母/数字/短横线且不能为空');
      return false;
    }
    if (!label) {
      ElMessage.warning('区服名称不能为空');
      return false;
    }
    if (seen.has(value)) {
      ElMessage.warning(`区服值重复：${value}`);
      return false;
    }
    seen.add(value);
  }
  return true;
}

async function save(): Promise<void> {
  if (!validate()) {
    return;
  }
  saving.value = true;
  try {
    await boosterApi.setRegions(
      options.value.map((option) => ({
        value: option.value.trim(),
        label: option.label.trim(),
      }))
    );
    ElMessage.success('接单区服选项已保存');
    visible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    title="接单区服配置"
    size="560px"
    class="admin-drawer booster-region-drawer"
    destroy-on-close
  >
    <p class="booster-muted">
      入驻表单的「接单区服」选项按此配置展示；区服值为系统内部标识（小写字母/数字/短横线），
      名称为展示文案。删除选项不影响已提交申请中的历史区服。
    </p>
    <el-alert
      v-if="loadFailed"
      type="error"
      :closable="false"
      show-icon
      title="区服选项加载失败"
    >
      <el-button
        size="small"
        @click="load"
      >
        重试
      </el-button>
    </el-alert>
    <el-table
      v-else
      v-loading="loading"
      :data="options"
      size="default"
    >
      <el-table-column
        label="区服值"
        min-width="180"
      >
        <template #default="{ row }">
          <el-input
            v-model="row.value"
            :maxlength="BOOSTER_SERVICE_REGION_LIMITS.valueMax"
            placeholder="如 delta-mobile"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="名称"
        min-width="180"
      >
        <template #default="{ row }">
          <el-input
            v-model="row.label"
            :maxlength="BOOSTER_SERVICE_REGION_LIMITS.labelMax"
            placeholder="如 三角洲 - 手机端"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="80"
        align="center"
      >
        <template #default="{ $index }">
          <el-button
            type="danger"
            link
            :icon="Delete"
            @click="removeOption($index)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button
      v-if="!loadFailed"
      class="booster-region-add"
      :icon="Plus"
      @click="addOption"
    >
      新增区服
    </el-button>
    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="visible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="loadFailed"
          @click="save"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.booster-region-add {
  margin-top: 12px;
}
</style>
