<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  CHINA_ID_CARD_PATTERN,
  RealnameStatus,
  type RealnameMineView,
} from '@app/contracts';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { realnameApi } from '@/api/realname.api';

/**
 * 我的实名认证：展示是否需实名与当前状态；未提交/被驳回时可提交证件信息。
 */
const loading = ref(false);
const submitting = ref(false);
const mine = ref<RealnameMineView | null>(null);
const formRef = ref<FormInstance>();

const form = reactive({
  realName: '',
  idCardNo: '',
  frontImage: '',
  backImage: '',
});

const status = computed(() => mine.value?.status ?? RealnameStatus.None);
const record = computed(() => mine.value?.record ?? null);
const required = computed(() => mine.value?.required ?? false);
/** 仅未提交或被驳回时允许提交/重提 */
const canSubmit = computed(
  () =>
    status.value === RealnameStatus.None ||
    status.value === RealnameStatus.Rejected,
);

const statusMeta: Record<
  RealnameStatus,
  { text: string; type: 'info' | 'warning' | 'success' | 'danger' }
> = {
  [RealnameStatus.None]: { text: '未认证', type: 'info' },
  [RealnameStatus.Pending]: { text: '审核中', type: 'warning' },
  [RealnameStatus.Approved]: { text: '已通过', type: 'success' },
  [RealnameStatus.Rejected]: { text: '已驳回', type: 'danger' },
};

const rules: FormRules = {
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 64, message: '姓名长度 2-64', trigger: 'blur' },
  ],
  idCardNo: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    {
      pattern: CHINA_ID_CARD_PATTERN,
      message: '身份证号格式不正确',
      trigger: 'blur',
    },
  ],
  frontImage: [{ required: true, message: '请上传身份证人像面', trigger: 'change' }],
  backImage: [{ required: true, message: '请上传身份证国徽面', trigger: 'change' }],
};

async function load(): Promise<void> {
  loading.value = true;
  try {
    mine.value = await realnameApi.mine();
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!formRef.value) {
    return;
  }
  await formRef.value.validate();
  submitting.value = true;
  try {
    await realnameApi.submit({ ...form });
    ElMessage.success('已提交，等待审核');
    form.realName = '';
    form.idCardNo = '';
    form.frontImage = '';
    form.backImage = '';
    await load();
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div
    v-loading="loading"
    class="realname-view"
  >
    <el-card shadow="never">
      <template #header>
        <div class="realname-header">
          <strong>实名认证</strong>
          <el-tag :type="statusMeta[status].type">
            {{ statusMeta[status].text }}
          </el-tag>
        </div>
      </template>

      <el-alert
        v-if="required && status !== RealnameStatus.Approved"
        class="realname-alert"
        type="warning"
        show-icon
        :closable="false"
        title="你的角色要求完成实名认证，请尽快提交认证信息"
      />
      <el-alert
        v-else-if="!required && status === RealnameStatus.None"
        class="realname-alert"
        type="info"
        show-icon
        :closable="false"
        title="你当前无需实名认证，也可主动提交完成认证"
      />

      <!-- 已提交：展示脱敏信息与审核结果 -->
      <el-descriptions
        v-if="record"
        class="realname-info"
        :column="1"
        border
      >
        <el-descriptions-item label="真实姓名">
          {{ record.realName }}
        </el-descriptions-item>
        <el-descriptions-item label="身份证号">
          {{ record.idCardMasked }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="status === RealnameStatus.Rejected"
          label="驳回理由"
        >
          <span class="realname-reject">{{ record.rejectReason }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 未提交 / 被驳回：可提交认证 -->
      <el-form
        v-if="canSubmit"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
        class="realname-form"
      >
        <el-form-item
          label="真实姓名"
          prop="realName"
        >
          <el-input
            v-model="form.realName"
            placeholder="请输入与身份证一致的姓名"
          />
        </el-form-item>
        <el-form-item
          label="身份证号"
          prop="idCardNo"
        >
          <el-input
            v-model="form.idCardNo"
            maxlength="18"
            placeholder="请输入 18 位身份证号"
          />
        </el-form-item>
        <el-form-item
          label="人像面"
          prop="frontImage"
        >
          <ImageUploader
            v-model="form.frontImage"
            self
          />
        </el-form-item>
        <el-form-item
          label="国徽面"
          prop="backImage"
        >
          <ImageUploader
            v-model="form.backImage"
            self
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            @click="submit"
          >
            {{ status === RealnameStatus.Rejected ? '重新提交' : '提交认证' }}
          </el-button>
        </el-form-item>
      </el-form>

      <el-empty
        v-else-if="status === RealnameStatus.Pending"
        description="认证信息审核中，请耐心等待"
      />
    </el-card>
  </div>
</template>

<style scoped>
.realname-view {
  max-width: 620px;
}
.realname-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.realname-alert,
.realname-info {
  margin-bottom: 16px;
}
.realname-reject {
  color: var(--el-color-danger);
}
.realname-form {
  margin-top: 8px;
}
</style>
