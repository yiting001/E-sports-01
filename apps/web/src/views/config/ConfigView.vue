<script setup lang="ts">
import type { ConfigItemView } from '@app/contracts';
import { ConfigGroup, ConfigValueType, PERMS } from '@app/contracts';
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { configApi, type UpsertConfigBody } from '@/api/config.api';

const list = ref<ConfigItemView[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);

const groups = Object.values(ConfigGroup);
const valueTypes = Object.values(ConfigValueType);

const form = reactive<UpsertConfigBody>({
  key: '',
  value: '',
  type: ConfigValueType.String,
  group: ConfigGroup.System,
  remark: '',
  secret: false,
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    list.value = await configApi.list();
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  isEdit.value = false;
  form.key = '';
  form.value = '';
  form.type = ConfigValueType.String;
  form.group = ConfigGroup.System;
  form.remark = '';
  form.secret = false;
  dialogVisible.value = true;
}

function openEdit(row: ConfigItemView): void {
  isEdit.value = true;
  form.key = row.key;
  form.value = row.secret ? '' : row.value;
  form.type = row.type;
  form.group = row.group;
  form.remark = row.remark;
  form.secret = row.secret;
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.key) {
    ElMessage.warning('配置键必填');
    return;
  }
  await configApi.upsert({ ...form });
  ElMessage.success('已保存');
  dialogVisible.value = false;
  await load();
}

async function remove(row: ConfigItemView): Promise<void> {
  await ElMessageBox.confirm(`确认删除配置 ${row.key}？`, '提示', { type: 'warning' });
  await configApi.remove(row.key);
  ElMessage.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button
        v-permission="PERMS.config.save"
        type="primary"
        @click="openCreate"
      >
        新增配置
      </el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="list"
      border
    >
      <el-table-column
        prop="key"
        label="键"
      />
      <el-table-column label="值">
        <template #default="{ row }">
          <span>{{ row.secret ? '******' : row.value }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="type"
        label="类型"
        width="100"
      />
      <el-table-column
        prop="group"
        label="分组"
        width="120"
      />
      <el-table-column
        prop="remark"
        label="备注"
      />
      <el-table-column
        label="操作"
        width="160"
      >
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.config.save"
            type="primary"
            link
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-permission="PERMS.config.remove"
            type="danger"
            link
            @click="remove(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑配置' : '新增配置'"
      width="480px"
    >
      <el-form label-width="72px">
        <el-form-item label="键">
          <el-input
            v-model="form.key"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="值">
          <el-input
            v-model="form.value"
            :placeholder="isEdit && form.secret ? '敏感项原值不回显，留空将清空' : ''"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option
              v-for="t in valueTypes"
              :key="t"
              :label="t"
              :value="t"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="form.group">
            <el-option
              v-for="g in groups"
              :key="g"
              :label="g"
              :value="g"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" />
        </el-form-item>
        <el-form-item label="敏感">
          <el-switch v-model="form.secret" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="save"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
}
</style>
