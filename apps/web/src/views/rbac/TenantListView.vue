<script setup lang="ts">
import type { CreateTenantPayload, TenantView } from "@app/contracts";
import { PAGINATION_DEFAULTS, TenantStatus } from "@app/contracts";
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { tenantApi } from "@/api/tenant.api";
import CreateTenantDialog from "@/components/rbac/tenant/CreateTenantDialog.vue";
import EditTenantDialog from "@/components/rbac/tenant/EditTenantDialog.vue";
import TenantDirectory from "@/components/rbac/tenant/TenantDirectory.vue";
import TenantStats from "@/components/rbac/tenant/TenantStats.vue";
import { buildTenantSiteUrl } from "@/components/rbac/tenant/tenant-site-url";
import type { EditTenantForm } from "@/components/rbac/tenant/tenant-ui.types";
import { ENV } from "@/config/env";
import "./TenantListView.css";
import "./TenantListView.responsive.css";

const list = ref<TenantView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);
const keyword = ref("");

const createVisible = ref(false);
const creating = ref(false);
const createForm = reactive<CreateTenantPayload>({
  code: "",
  name: "",
  remark: "",
});

const editVisible = ref(false);
const editForm = reactive<EditTenantForm>({
  id: "",
  name: "",
  status: TenantStatus.Enabled,
  remark: "",
  builtin: false,
});

const statusOptions = [
  { label: "启用", value: TenantStatus.Enabled },
  { label: "停用", value: TenantStatus.Disabled },
];

const enabledCount = computed(
  () => list.value.filter((item) => item.status === TenantStatus.Enabled).length
);
const builtinCount = computed(
  () => list.value.filter((item) => item.builtin).length
);
const normalCount = computed(() =>
  Math.max(total.value - builtinCount.value, 0)
);

function statusLabel(status: TenantStatus): string {
  return status === TenantStatus.Enabled ? "启用" : "停用";
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
    const res = await tenantApi.list(
      page.value,
      pageSize.value,
      keyword.value || undefined
    );
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function search(): Promise<void> {
  page.value = 1;
  await load();
}

async function resetSearch(): Promise<void> {
  keyword.value = "";
  await search();
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

function openCreate(): void {
  createForm.code = "";
  createForm.name = "";
  createForm.remark = "";
  createVisible.value = true;
}

function updateCreateForm(value: CreateTenantPayload): void {
  Object.assign(createForm, value);
}

async function create(): Promise<void> {
  if (!createForm.code || !createForm.name) {
    ElMessage.warning("租户编码与名称必填");
    return;
  }
  creating.value = true;
  try {
    await tenantApi.create({
      code: createForm.code,
      name: createForm.name,
      remark: createForm.remark || undefined,
    });
    ElMessage.success("创建成功，可到用户管理为该租户单独创建账号");
    createVisible.value = false;
    await load();
  } finally {
    creating.value = false;
  }
}

function openEdit(row: TenantView): void {
  editForm.id = row.id;
  editForm.name = row.name;
  editForm.status = row.status;
  editForm.remark = row.remark;
  editForm.builtin = row.builtin;
  editVisible.value = true;
}

function visitTenant(row: TenantView): void {
  const target = buildTenantSiteUrl(
    ENV.clientBaseUrl,
    row.code,
    window.location.href
  );
  if (!target) {
    ElMessage.error("C 端站点地址未配置，请联系系统管理员");
    return;
  }
  window.open(target, "_blank", "noopener,noreferrer");
}

function updateEditForm(value: EditTenantForm): void {
  Object.assign(editForm, value);
}

async function saveEdit(): Promise<void> {
  await tenantApi.update(editForm.id, {
    name: editForm.name,
    status: editForm.status,
    remark: editForm.remark,
  });
  ElMessage.success("已保存");
  editVisible.value = false;
  await load();
}

onMounted(load);
</script>

<template>
  <section class="admin-page tenant-page">
    <tenant-stats
      :total="total"
      :enabled-count="enabledCount"
      :normal-count="normalCount"
    />
    <tenant-directory
      v-model:keyword="keyword"
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :status-label="statusLabel"
      :format-date="formatDate"
      @update:page="changePage"
      @update:page-size="changePageSize"
      @search="search"
      @reset="resetSearch"
      @create="openCreate"
      @edit="openEdit"
      @visit="visitTenant"
    />
    <create-tenant-dialog
      v-model="createVisible"
      :form="createForm"
      :submitting="creating"
      @update:form="updateCreateForm"
      @submit="create"
    />
    <edit-tenant-dialog
      v-model="editVisible"
      :form="editForm"
      :status-options="statusOptions"
      @update:form="updateEditForm"
      @submit="saveEdit"
    />
  </section>
</template>
