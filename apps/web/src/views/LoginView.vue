<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChatDotRound, Key, Lock, Phone, Platform, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { authApi } from '@/api/auth.api';
import AuthHeroPanel from '@/components/auth/AuthHeroPanel.vue';
import { useAuthStore } from '@/stores/auth.store';
import './LoginView.css';

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

/** 登录成功后跳转回原目标页，缺省进入工作台 */
async function goRedirect(): Promise<void> {
  const redirect = (route.query.redirect as string) || '/dashboard';
  await router.push(redirect);
}

/** 提交账号密码登录或注册，业务调用保持由 auth.store 承接 */
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

/** 发送短信验证码，倒计时由本视图维护 */
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

/** 提交短信验证码登录 */
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
  <div class="login-page">
    <section
      class="auth-shell"
      aria-label="基础设施平台登录注册"
    >
      <AuthHeroPanel />

      <main class="form-panel">
        <div class="form-heading">
          <div class="form-icon">
            <el-icon><Platform /></el-icon>
          </div>
          <p>统一身份入口</p>
          <h2>{{ tab === 'sms' ? '验证码登录' : mode === 'login' ? '欢迎回来' : '创建账号' }}</h2>
          <span>
            {{
              tab === 'sms'
                ? '使用已绑定手机号快速进入平台。'
                : mode === 'login'
                  ? '使用账号或手机号登录工作台。'
                  : '完成基础信息后即可进入平台。'
            }}
          </span>
        </div>

        <el-tabs
          v-model="tab"
          class="auth-tabs"
          stretch
        >
          <el-tab-pane
            label="账号密码"
            name="password"
          >
            <el-form
              class="auth-form"
              label-position="top"
              @submit.prevent
            >
              <el-form-item
                v-if="mode === 'login'"
                label="账号"
              >
                <el-input
                  v-model="form.account"
                  size="large"
                  :prefix-icon="User"
                  placeholder="用户名或手机号"
                  @keyup.enter="submit"
                />
              </el-form-item>
              <el-form-item
                v-else
                label="用户名"
              >
                <el-input
                  v-model="form.username"
                  size="large"
                  :prefix-icon="User"
                  placeholder="请输入用户名"
                  @keyup.enter="submit"
                />
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="form.password"
                  size="large"
                  type="password"
                  show-password
                  :prefix-icon="Lock"
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
                  size="large"
                  :prefix-icon="Key"
                  placeholder="选填"
                  @keyup.enter="submit"
                />
              </el-form-item>
              <el-form-item
                v-if="mode === 'register'"
                label="手机号"
              >
                <el-input
                  v-model="form.phone"
                  size="large"
                  maxlength="11"
                  :prefix-icon="Phone"
                  placeholder="选填，绑定后可短信登录"
                  @keyup.enter="submit"
                />
              </el-form-item>
              <el-button
                class="primary-action"
                type="primary"
                size="large"
                :loading="loading"
                @click="submit"
              >
                {{ mode === 'login' ? '登录' : '注册' }}
              </el-button>
              <div class="mode-switch">
                <span>{{ mode === 'login' ? '没有账号？' : '已有账号？' }}</span>
                <el-button
                  link
                  @click="mode = mode === 'login' ? 'register' : 'login'"
                >
                  {{ mode === 'login' ? '去注册' : '去登录' }}
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane
            label="短信验证码"
            name="sms"
          >
            <el-form
              class="auth-form"
              label-position="top"
              @submit.prevent
            >
              <el-form-item label="手机号">
                <el-input
                  v-model="smsForm.phone"
                  size="large"
                  maxlength="11"
                  :prefix-icon="Phone"
                  placeholder="请输入已绑定的手机号"
                  @keyup.enter="smsSubmit"
                />
              </el-form-item>
              <el-form-item label="验证码">
                <div class="code-row">
                  <el-input
                    v-model="smsForm.code"
                    size="large"
                    :prefix-icon="ChatDotRound"
                    placeholder="请输入验证码"
                    @keyup.enter="smsSubmit"
                  />
                  <el-button
                    class="code-button"
                    size="large"
                    :loading="sending"
                    :disabled="countdown > 0"
                    @click="sendCode"
                  >
                    {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
                  </el-button>
                </div>
              </el-form-item>
              <el-button
                class="primary-action"
                type="primary"
                size="large"
                :loading="loading"
                @click="smsSubmit"
              >
                登录
              </el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </main>
    </section>
  </div>
</template>
