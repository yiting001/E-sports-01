<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/** 登录方式：账号密码 / 短信验证码 */
const tab = ref<'password' | 'sms'>('password');
/** 账号密码页内子模式：登录 / 注册 */
const mode = ref<'login' | 'register'>('login');
const loading = ref(false);

const form = reactive({ account: '', username: '', password: '', nickname: '', phone: '' });
const smsForm = reactive({ phone: '', code: '' });

/** 验证码发送冷却倒计时（秒） */
const countdown = ref(0);
const sending = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

function startCountdown(seconds: number): void {
  countdown.value = seconds;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);
}

onUnmounted(() => clearInterval(timer));

async function goRedirect(): Promise<void> {
  const redirect = (route.query.redirect as string) || '/dashboard';
  await router.push(redirect);
}

async function submit(): Promise<void> {
  if (mode.value === 'login') {
    if (!form.account || !form.password) {
      ElMessage.warning('请输入账号与密码');
      return;
    }
  } else if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名与密码');
    return;
  }
  loading.value = true;
  try {
    if (mode.value === 'login') {
      await auth.login({ account: form.account, password: form.password });
    } else {
      await auth.register({
        username: form.username,
        password: form.password,
        nickname: form.nickname || undefined,
        phone: form.phone || undefined,
      });
    }
    await goRedirect();
  } finally {
    loading.value = false;
  }
}

async function sendCode(): Promise<void> {
  if (!CHINA_MOBILE_PATTERN.test(smsForm.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  sending.value = true;
  try {
    const { cooldown } = await authApi.sendSmsCode({ phone: smsForm.phone });
    ElMessage.success('验证码已发送');
    startCountdown(cooldown);
  } finally {
    sending.value = false;
  }
}

async function smsSubmit(): Promise<void> {
  if (!CHINA_MOBILE_PATTERN.test(smsForm.phone) || !smsForm.code) {
    ElMessage.warning('请输入手机号与验证码');
    return;
  }
  loading.value = true;
  try {
    await auth.smsLogin({ phone: smsForm.phone, code: smsForm.code });
    await goRedirect();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <el-card class="card">
      <template #header>
        <div class="card-header">
          基础设施平台
        </div>
      </template>

      <el-tabs v-model="tab">
        <el-tab-pane
          label="账号密码"
          name="password"
        >
          <el-form
            label-width="72px"
            @submit.prevent
          >
            <el-form-item
              v-if="mode === 'login'"
              label="账号"
            >
              <el-input
                v-model="form.account"
                placeholder="用户名或手机号"
              />
            </el-form-item>
            <el-form-item
              v-else
              label="用户名"
            >
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
              />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="form.password"
                type="password"
                show-password
                placeholder="请输入密码"
                @keyup.enter="submit"
              />
            </el-form-item>
            <el-form-item
              v-if="mode === 'register'"
              label="昵称"
            >
              <el-input
                v-model="form.nickname"
                placeholder="选填"
              />
            </el-form-item>
            <el-form-item
              v-if="mode === 'register'"
              label="手机号"
            >
              <el-input
                v-model="form.phone"
                maxlength="11"
                placeholder="选填，绑定后可短信登录"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                @click="submit"
              >
                {{ mode === 'login' ? '登录' : '注册' }}
              </el-button>
              <el-button
                link
                @click="mode = mode === 'login' ? 'register' : 'login'"
              >
                {{ mode === 'login' ? '没有账号？去注册' : '已有账号？去登录' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane
          label="短信验证码"
          name="sms"
        >
          <el-form
            label-width="72px"
            @submit.prevent
          >
            <el-form-item label="手机号">
              <el-input
                v-model="smsForm.phone"
                maxlength="11"
                placeholder="请输入已绑定的手机号"
              />
            </el-form-item>
            <el-form-item label="验证码">
              <div class="code-row">
                <el-input
                  v-model="smsForm.code"
                  placeholder="请输入验证码"
                  @keyup.enter="smsSubmit"
                />
                <el-button
                  :loading="sending"
                  :disabled="countdown > 0"
                  @click="sendCode"
                >
                  {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                @click="smsSubmit"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f0f2f5;
}
.card {
  width: 420px;
}
.card-header {
  font-weight: 600;
}
.code-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.code-row .el-input {
  flex: 1;
}
</style>
