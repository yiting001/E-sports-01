<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChatDotRound, OfficeBuilding, Phone, Platform, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { authApi } from '@/api/auth.api';
import AuthHeroPanel from '@/components/auth/AuthHeroPanel.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import './LoginView.css';

const auth = useAuthStore();
const branding = useBrandingStore();
const router = useRouter();
const route = useRoute();

/** 入口：短信登录 / 短信注册（本站仅支持短信方式，注册用户默认角色为普通用户 member） */
const tab = ref<'login' | 'register'>('login');
const loading = ref(false);

const loginForm = reactive({ phone: '', code: '' });
const registerForm = reactive({ phone: '', code: '', nickname: '' });
/** 租户编码（选填）：留空则归入平台默认租户，多租户下用于消解同名歧义 */
const tenantCode = ref('');

/** 验证码发送冷却倒计时（秒），登录/注册共用一份，切换入口时重置 */
const countdown = ref(0);
const sending = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

function startCountdown(seconds: number): void {
  clearInterval(timer);
  countdown.value = seconds;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);
}

watch(tab, () => {
  clearInterval(timer);
  countdown.value = 0;
});

onUnmounted(() => clearInterval(timer));

/** 登录成功后跳转回原目标页，缺省进入工作台 */
async function goRedirect(): Promise<void> {
  const redirect = (route.query.redirect as string) || '/dashboard';
  await router.push(redirect);
}

/** 发送验证码：按当前入口选择「登录发码」或「注册发码」，倒计时由本视图维护 */
async function sendCode(): Promise<void> {
  const phone = tab.value === 'login' ? loginForm.phone : registerForm.phone;
  if (!CHINA_MOBILE_PATTERN.test(phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  const payload = { phone, tenantCode: tenantCode.value.trim() || undefined };
  sending.value = true;
  try {
    const { cooldown } =
      tab.value === 'login'
        ? await authApi.sendSmsCode(payload)
        : await authApi.sendSmsRegisterCode(payload);
    ElMessage.success('验证码已发送');
    startCountdown(cooldown);
  } finally {
    sending.value = false;
  }
}

/** 提交短信验证码登录 */
async function loginSubmit(): Promise<void> {
  if (!CHINA_MOBILE_PATTERN.test(loginForm.phone) || !loginForm.code) {
    ElMessage.warning('请输入手机号与验证码');
    return;
  }
  loading.value = true;
  try {
    await auth.smsLogin({
      phone: loginForm.phone,
      code: loginForm.code,
      tenantCode: tenantCode.value.trim() || undefined,
    });
    await goRedirect();
  } finally {
    loading.value = false;
  }
}

/** 提交短信验证码注册，成功后自动登录并跳转 */
async function registerSubmit(): Promise<void> {
  if (!CHINA_MOBILE_PATTERN.test(registerForm.phone) || !registerForm.code) {
    ElMessage.warning('请输入手机号与验证码');
    return;
  }
  loading.value = true;
  try {
    await auth.smsRegister({
      phone: registerForm.phone,
      code: registerForm.code,
      nickname: registerForm.nickname.trim() || undefined,
      tenantCode: tenantCode.value.trim() || undefined,
    });
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
      :aria-label="`${branding.appName}登录注册`"
    >
      <AuthHeroPanel />

      <main class="form-panel">
        <div class="form-heading">
          <div class="form-icon">
            <el-icon><Platform /></el-icon>
          </div>
          <p>统一身份入口</p>
          <h2>{{ tab === 'login' ? '验证码登录' : '创建账号' }}</h2>
          <span>
            {{
              tab === 'login'
                ? '使用手机号与短信验证码快速进入平台。'
                : '手机号验证即可注册，注册用户默认为普通用户。'
            }}
          </span>
        </div>

        <el-tabs
          v-model="tab"
          class="auth-tabs"
          stretch
        >
          <el-tab-pane
            label="短信登录"
            name="login"
          >
            <el-form
              class="auth-form"
              label-position="top"
              @submit.prevent
            >
              <el-form-item label="手机号">
                <el-input
                  v-model="loginForm.phone"
                  size="large"
                  maxlength="11"
                  :prefix-icon="Phone"
                  placeholder="请输入已注册的手机号"
                  @keyup.enter="loginSubmit"
                />
              </el-form-item>
              <el-form-item label="验证码">
                <div class="code-row">
                  <el-input
                    v-model="loginForm.code"
                    size="large"
                    :prefix-icon="ChatDotRound"
                    placeholder="请输入验证码"
                    @keyup.enter="loginSubmit"
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
              <el-form-item label="租户编码">
                <el-input
                  v-model="tenantCode"
                  size="large"
                  :prefix-icon="OfficeBuilding"
                  placeholder="选填，默认进入平台默认租户"
                  @keyup.enter="loginSubmit"
                />
              </el-form-item>
              <el-button
                class="primary-action"
                type="primary"
                size="large"
                :loading="loading"
                @click="loginSubmit"
              >
                登录
              </el-button>
              <div class="mode-switch">
                <span>没有账号？</span>
                <el-button
                  link
                  @click="tab = 'register'"
                >
                  去注册
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane
            label="短信注册"
            name="register"
          >
            <el-form
              class="auth-form"
              label-position="top"
              @submit.prevent
            >
              <el-form-item label="手机号">
                <el-input
                  v-model="registerForm.phone"
                  size="large"
                  maxlength="11"
                  :prefix-icon="Phone"
                  placeholder="请输入手机号"
                  @keyup.enter="registerSubmit"
                />
              </el-form-item>
              <el-form-item label="验证码">
                <div class="code-row">
                  <el-input
                    v-model="registerForm.code"
                    size="large"
                    :prefix-icon="ChatDotRound"
                    placeholder="请输入验证码"
                    @keyup.enter="registerSubmit"
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
              <el-form-item label="昵称">
                <el-input
                  v-model="registerForm.nickname"
                  size="large"
                  maxlength="64"
                  :prefix-icon="User"
                  placeholder="选填，默认按手机号生成"
                  @keyup.enter="registerSubmit"
                />
              </el-form-item>
              <el-form-item label="租户编码">
                <el-input
                  v-model="tenantCode"
                  size="large"
                  :prefix-icon="OfficeBuilding"
                  placeholder="选填，默认进入平台默认租户"
                  @keyup.enter="registerSubmit"
                />
              </el-form-item>
              <el-button
                class="primary-action"
                type="primary"
                size="large"
                :loading="loading"
                @click="registerSubmit"
              >
                注册并登录
              </el-button>
              <div class="mode-switch">
                <span>已有账号？</span>
                <el-button
                  link
                  @click="tab = 'login'"
                >
                  去登录
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </main>
    </section>
  </div>
</template>
