<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  CHINA_ID_CARD_PATTERN,
  RealnameStatus,
  type RealnameMineView,
} from '@app/contracts';
import { Check, Refresh, WarningFilled } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import ImageUploader from '@/components/common/ImageUploader.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { realnameApi } from '@/api/realname.api';
import './RealnameMineView.css';
import './RealnameMineView.responsive.css';

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
const canSubmit = computed(
  () => status.value === RealnameStatus.None || status.value === RealnameStatus.Rejected,
);
const pageHint = computed(() => {
  if (required.value && status.value !== RealnameStatus.Approved) {
    return '当前角色要求完成实名认证，请提交证件信息等待审核。';
  }
  if (!required.value && status.value === RealnameStatus.None) {
    return '当前账号暂不强制实名，也可以主动提交完成认证。';
  }
  if (status.value === RealnameStatus.Pending) {
    return '认证信息已提交，请等待管理员审核。';
  }
  if (status.value === RealnameStatus.Approved) {
    return '实名认证已通过。';
  }
  return '认证已驳回，请根据原因修正后重新提交。';
});

const statusMeta: Record<
  RealnameStatus,
  { text: string; type: 'info' | 'warning' | 'success' | 'danger'; className: string }
> = {
  [RealnameStatus.None]: { text: '未认证', type: 'info', className: 'is-none' },
  [RealnameStatus.Pending]: { text: '审核中', type: 'warning', className: 'is-pending' },
  [RealnameStatus.Approved]: { text: '已通过', type: 'success', className: 'is-approved' },
  [RealnameStatus.Rejected]: { text: '已驳回', type: 'danger', className: 'is-rejected' },
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

function resetForm(): void {
  form.realName = '';
  form.idCardNo = '';
  form.frontImage = '';
  form.backImage = '';
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
    resetForm();
    await load();
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section
    v-loading="loading"
    class="admin-page realname-mine-page"
  >
    <app-panel
      class="realname-mine-panel"
      title="实名认证"
      :description="pageHint"
    >
      <template #actions>
        <el-button
          :icon="Refresh"
          @click="load"
        >
          刷新
        </el-button>
      </template>
      <div
        class="realname-status"
        :class="statusMeta[status].className"
      >
        <div>
          <span>认证状态</span>
          <strong>{{ statusMeta[status].text }}</strong>
        </div>
        <el-tag
          round
          effect="light"
          :type="statusMeta[status].type"
        >
          {{ required ? '角色要求实名' : '非强制实名' }}
        </el-tag>
      </div>

      <div
        v-if="record"
        class="realname-record"
      >
        <div>
          <span>真实姓名</span>
          <strong>{{ record.realName }}</strong>
        </div>
        <div>
          <span>身份证号</span>
          <strong>{{ record.idCardMasked }}</strong>
        </div>
        <div v-if="status === RealnameStatus.Rejected">
          <span>驳回理由</span>
          <strong class="realname-reject">{{ record.rejectReason || '未填写原因' }}</strong>
        </div>
      </div>

      <el-alert
        v-if="status === RealnameStatus.Rejected"
        class="realname-alert"
        type="error"
        show-icon
        :closable="false"
        title="认证被驳回，请核对信息后重新提交"
      />

      <el-form
        v-if="canSubmit"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="98px"
        class="realname-form"
      >
        <div class="realname-fields">
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
        </div>

        <div class="realname-upload-section">
          <div class="realname-section-title">
            <strong>证件照片</strong>
            <span>请上传身份证正反面，保证文字和边角清晰完整。</span>
          </div>

          <div class="realname-upload-grid">
            <el-form-item
              prop="frontImage"
              class="realname-upload-item"
            >
              <div class="realname-upload-card">
                <div class="realname-upload-card__head">
                  <strong><span>*</span>身份证人像面</strong>
                  <small>姓名、头像、身份证号需清晰可见</small>
                </div>
                <ImageUploader
                  v-model="form.frontImage"
                  self
                />
              </div>
            </el-form-item>
            <el-form-item
              prop="backImage"
              class="realname-upload-item"
            >
              <div class="realname-upload-card">
                <div class="realname-upload-card__head">
                  <strong><span>*</span>身份证国徽面</strong>
                  <small>签发机关和有效期限需清晰可见</small>
                </div>
                <ImageUploader
                  v-model="form.backImage"
                  self
                />
              </div>
            </el-form-item>
          </div>
        </div>

        <div class="realname-form-tip">
          <el-icon><WarningFilled /></el-icon>
          <span>请上传清晰、完整的身份证正反面照片，提交后等待管理员审核。</span>
        </div>

        <el-form-item class="realname-actions">
          <el-button @click="resetForm">
            重置
          </el-button>
          <el-button
            type="primary"
            :icon="Check"
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
    </app-panel>
  </section>
</template>
