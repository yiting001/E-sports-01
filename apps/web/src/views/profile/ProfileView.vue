<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 个人中心：登录用户自助维护本人资料（头像 / 昵称 / 手机号）。
 * 保存后回灌 auth.store 的 profile，使侧边栏头像/昵称即时更新。
 */
const auth = useAuthStore();
const formRef = ref<FormInstance>();
const saving = ref(false);

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
      validator: (_r, value: string, cb) => {
        if (!value || CHINA_MOBILE_PATTERN.test(value)) {
          cb();
          return;
        }
        cb(new Error('手机号格式不正确'));
      },
      trigger: 'blur',
    },
  ],
};

/** 从当前档案回填表单（用户名只读，仅展示） */
function fill(): void {
  const p = auth.profile;
  form.username = p?.username ?? '';
  form.avatar = p?.avatar ?? '';
  form.nickname = p?.nickname ?? '';
  form.phone = p?.phone ?? '';
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
    void auth.loadProfile().then(fill);
    return;
  }
  fill();
});
</script>

<template>
  <div class="profile-view">
    <el-card shadow="never">
      <template #header>
        <div class="profile-header">
          <strong>个人中心</strong>
          <span>维护你的头像、昵称与绑定手机号</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="96px"
        class="profile-form"
      >
        <el-form-item label="头像">
          <ImageUploader
            v-model="form.avatar"
            self
          />
        </el-form-item>
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
          />
        </el-form-item>
        <el-form-item
          label="手机号"
          prop="phone"
        >
          <el-input
            v-model="form.phone"
            maxlength="20"
            placeholder="绑定后可用短信验证码登录；清空并保存即解绑"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="saving"
            @click="save"
          >
            保存
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 560px;
}
.profile-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.profile-header span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.profile-form {
  margin-top: 8px;
}
</style>
