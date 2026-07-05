<script setup lang="ts">
/**
 * 押金交付策略配置弹窗（booster:deposit:policy:set）。
 * 管理端设置最低/最高交付额（元输入，分存储）：
 * 最低额为打手接单门槛，最高额为缴纳上限；打手在区间内自选金额缴纳。
 */
import { ref, watch } from 'vue';
import { fenToYuan, yuanToFen } from '@app/contracts';
import { ElMessage } from 'element-plus';
import { boosterApi } from '@/api/booster.api';

const visible = defineModel<boolean>({ required: true });

const minYuan = ref(0);
const maxYuan = ref(0);
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
    const policy = await boosterApi.getDepositPolicy();
    minYuan.value = Number(fenToYuan(policy.minFen));
    maxYuan.value = Number(fenToYuan(policy.maxFen));
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  const minFen = yuanToFen(String(minYuan.value));
  const maxFen = yuanToFen(String(maxYuan.value));
  if (maxFen < minFen) {
    ElMessage.warning('最高交付额不得低于最低交付额');
    return;
  }
  saving.value = true;
  try {
    await boosterApi.setDepositPolicy({ minFen, maxFen });
    ElMessage.success('押金交付策略已保存');
    visible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="押金交付配置"
    width="460px"
  >
    <p class="booster-muted">
      打手需缴押金达到最低交付额方可接单，可在最高交付额内继续追加；最低额为 0 表示不要求押金。
    </p>
    <el-form
      v-loading="loading"
      label-width="110px"
      @submit.prevent
    >
      <el-form-item label="最低交付（元）">
        <el-input-number
          v-model="minYuan"
          :min="0"
          :precision="2"
          :step="10"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="最高交付（元）">
        <el-input-number
          v-model="maxYuan"
          :min="0"
          :precision="2"
          :step="10"
          controls-position="right"
        />
      </el-form-item>
    </el-form>
    <template #footer>
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
    </template>
  </el-dialog>
</template>
