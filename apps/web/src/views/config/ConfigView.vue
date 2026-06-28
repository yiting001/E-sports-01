<script setup lang="ts">
import type { ConfigItemView } from '@app/contracts';
import { ConfigGroup, ConfigValueType } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { configApi } from '@/api/config.api';
import ConfigDirectory from '@/components/config/ConfigDirectory.vue';
import ConfigFormDialog from '@/components/config/ConfigFormDialog.vue';
import ConfigHero from '@/components/config/ConfigHero.vue';
import ConfigStats from '@/components/config/ConfigStats.vue';
import {
  CONFIG_GROUP_META,
  CONFIG_TYPE_META,
  type ConfigFormModel,
} from '@/components/config/config-ui';
import './ConfigView.css';
import './ConfigView.responsive.css';

const list = ref<ConfigItemView[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const keyword = ref('');

const groups = Object.values(ConfigGroup);
const valueTypes = Object.values(ConfigValueType);

const form = reactive<ConfigFormModel>(emptyForm());

const groupCount = computed(() => new Set(list.value.map((item) => item.group)).size);
const secretCount = computed(() => list.value.filter((item) => item.secret).length);
const richTextCount = computed(
  () => list.value.filter((item) => item.type === ConfigValueType.RichText).length,
);
const filteredList = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  if (!query) {
    return list.value;
  }
  return list.value.filter((item) =>
    getSearchFields(item).some((field) => field.toLowerCase().includes(query)),
  );
});

function emptyForm(): ConfigFormModel {
  return {
    key: '',
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.System,
    remark: '',
    secret: false,
  };
}

function getSearchFields(item: ConfigItemView): string[] {
  return [
    item.key,
    item.group,
    CONFIG_GROUP_META[item.group].label,
    item.type,
    CONFIG_TYPE_META[item.type].label,
    item.remark,
    item.secret ? '' : item.value,
  ].filter(Boolean);
}

function updateKeyword(value: string): void {
  keyword.value = value;
}

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
  Object.assign(form, emptyForm());
  dialogVisible.value = true;
}

function openEdit(row: ConfigItemView): void {
  isEdit.value = true;
  Object.assign(form, {
    key: row.key,
    value: row.secret ? '' : row.value,
    type: row.type,
    group: row.group,
    remark: row.remark,
    secret: row.secret,
  });
  dialogVisible.value = true;
}

function updateForm(value: ConfigFormModel): void {
  Object.assign(form, value);
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
  <section class="config-page">
    <config-hero />
    <config-stats
      :total="list.length"
      :group-count="groupCount"
      :secret-count="secretCount"
      :rich-text-count="richTextCount"
    />
    <config-directory
      :list="filteredList"
      :loading="loading"
      :keyword="keyword"
      :total="list.length"
      :matched-count="filteredList.length"
      @update:keyword="updateKeyword"
      @refresh="load"
      @create="openCreate"
      @edit="openEdit"
      @remove="remove"
    />
    <config-form-dialog
      v-model="dialogVisible"
      :form="form"
      :is-edit="isEdit"
      :value-types="valueTypes"
      :groups="groups"
      @update:form="updateForm"
      @submit="save"
    />
  </section>
</template>
