<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { Check, Refresh, UserFilled } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import './ProfileView.css';
import './ProfileView.responsive.css';

const auth = useAuthStore();
const formRef = ref<FormInstance>();
const saving = ref(false);
const loading = ref(false);

const form = reactive({
  username: '',
  avatar: '',
  nickname: '',
  phone: '',
});

const rules: FormRules = {
  nickname: [{ max: 64, message: '昵称不超过 64 个字符', trigger: 'blur' }],
  phone: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value || CHINA_MOBILE_PATTERN.test(value)) {
          callback();
          return;
        }
        callback(new Error('手机号格式不正确'));
      },
      trigger: 'blur',
    },
  ],
};

const displayName = computed(
  () => form.nickname || auth.profile?.nickname || auth.profile?.username || '-',
);
const roleLabel = computed(() => (auth.profile?.isSuper ? '超级管理员' : '授权账号'));
const tenantText = computed(() => auth.profile?.tenantName || auth.profile?.tenantCode || '-');
const phoneStatus = computed(() => (form.phone ? '已绑定手机号' : '未绑定手机号'));

function fill(): void {
  const profile = auth.profile;
  form.username = profile?.username ?? '';
  form.avatar = profile?.avatar ?? '';
  form.nickname = profile?.nickname ?? '';
  form.phone = profile?.phone ?? '';
}

async function refreshProfile(): Promise<void> {
  loading.value = true;
  try {
    await auth.loadProfile();
    fill();
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  if (!formRef.value) {
    return;
  }
  await formRef.value.validate();
  saving.value = true;
  try {
    await authApi.updateProfile({
      nickname: form.nickname,
      avatar: form.avatar,
      phone: form.phone,
    });
    await auth.loadProfile();
    fill();
    ElMessage.success('资料已更新');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (!auth.loaded) {
    void refreshProfile();
    return;
  }
  fill();
});
</script>

<template>
  <section
    v-loading="loading"
    class="profile-page"
  >
    <header class="profile-header">
      <div>
        <h1>个人中心</h1>
        <p>维护头像、昵称和手机号。</p>
      </div>
      <el-button
        :icon="Refresh"
        @click="refreshProfile"
      >
        刷新
      </el-button>
    </header>

    <section class="profile-panel">
      <div class="profile-account">
        <span class="profile-avatar">
          <img
            v-if="form.avatar"
            :src="form.avatar"
            alt="头像"
          >
          <el-icon v-else><UserFilled /></el-icon>
        </span>
        <div class="profile-account__main">
          <strong>{{ displayName }}</strong>
          <span>{{ form.username || '-' }}</span>
        </div>
        <div class="profile-account__meta">
          <span>{{ roleLabel }}</span>
          <span>{{ tenantText }}</span>
          <span>{{ phoneStatus }}</span>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="88px"
        class="profile-form"
      >
        <div class="profile-form__grid">
          <el-form-item label="头像">
            <ImageUploader
              v-model="form.avatar"
              self
            />
          </el-form-item>

          <div class="profile-fields">
            <el-form-item label="用户名">
              <el-input
                v-model="form.username"
                disabled
              />
            </el-form-item>
            <el-form-item
              label="昵称"
              prop="nickname"
            >
              <el-input
                v-model="form.nickname"
                maxlength="64"
                placeholder="请输入昵称"
                show-word-limit
              />
            </el-form-item>
            <el-form-item
              label="手机号"
              prop="phone"
            >
              <el-input
                v-model="form.phone"
                maxlength="20"
                placeholder="清空并保存即解绑手机号"
              />
            </el-form-item>
            <el-form-item class="profile-actions">
              <el-button @click="fill">
                重置
              </el-button>
              <el-button
                type="primary"
                :icon="Check"
                :loading="saving"
                @click="save"
              >
                保存
              </el-button>
            </el-form-item>
          </div>
        </div>
      </el-form>
    </section>
  </section>
</template>
