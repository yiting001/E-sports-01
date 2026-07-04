<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChatDotRound, Iphone, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { authApi } from '@/api/auth.api';
import AuthHeroPanel from '@/components/auth/AuthHeroPanel.vue';
import { resolveHttpErrorMessage } from '@/utils/http-error';
import { useAuthStore } from '@/stores/auth.store';
import './LoginView.css';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/** 入口：短信登录 / 短信注册 */
const tab = ref<'login' | 'register'>('login');
const submitting = ref(false);

const loginForm = reactive({ phone: '', code: '' });
const registerForm = reactive({ phone: '', code: '', nickname: '' });

/** 验证码发送冷却倒计时（秒），登录/注册共用同一窗口 */
const countdown = ref(0);
const sending = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

/** 切换入口时重置倒计时，避免跨表单误导可点状态 */
watch(tab, () => {
  countdown.value = 0;
  clearInterval(timer);
});

onUnmounted(() => clearInterval(timer));

const currentPhone = computed(() => (tab.value === 'login' ? loginForm.phone : registerForm.phone));
const codeButtonText = computed(() => (countdown.value > 0 ? `${countdown.value}s 后重发` : '发送验证码'));

function startCountdown(seconds: number): void {
  countdown.value = seconds;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);
}

/** 校验手机号，非法则提示并返回 false */
function ensurePhone(phone: string): boolean {
  if (!CHINA_MOBILE_PATTERN.test(phone)) {
    ElMessage.warning('请输入正确的手机号');
    return false;
  }
  return true;
}

/** 发送验证码：按当前入口选择「登录/注册」对应接口 */
async function sendCode(): Promise<void> {
  const phone = currentPhone.value;
  if (!ensurePhone(phone) || countdown.value > 0 || sending.value) {
    return;
  }
  sending.value = true;
  try {
    const result =
      tab.value === 'login'
        ? await authApi.sendSmsLoginCode({ phone })
        : await authApi.sendSmsRegisterCode({ phone });
    startCountdown(result.cooldown);
    ElMessage.success('验证码已发送');
  } catch (error) {
    ElMessage.error(resolveHttpErrorMessage(error, '验证码发送失败'));
  } finally {
    sending.value = false;
  }
}

/** 登录成功后跳转回原目标页，缺省进入用户首页 */
async function goRedirect(): Promise<void> {
  const redirect = (route.query.redirect as string) || '/';
  await router.push(redirect);
}

/** 提交短信登录 */
async function loginSubmit(): Promise<void> {
  if (!ensurePhone(loginForm.phone) || !loginForm.code) {
    ElMessage.warning('请输入手机号与验证码');
    return;
  }
  submitting.value = true;
  try {
    await auth.smsLogin({ phone: loginForm.phone, code: loginForm.code });
    await goRedirect();
  } finally {
    submitting.value = false;
  }
}

/** 提交短信注册：注册成功即自动登录 */
async function registerSubmit(): Promise<void> {
  if (!ensurePhone(registerForm.phone) || !registerForm.code) {
    ElMessage.warning('请输入手机号与验证码');
    return;
  }
  submitting.value = true;
  try {
    await auth.smsRegister({
      phone: registerForm.phone,
      code: registerForm.code,
      nickname: registerForm.nickname.trim() || undefined,
    });
    ElMessage.success('注册成功，已自动登录');
    await goRedirect();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="auth-shell">
      <AuthHeroPanel />

      <div class="form-panel">
        <span class="form-icon"><el-icon><ChatDotRound /></el-icon></span>
        <div class="form-heading">
          <p>Esports Club</p>
          <h2>验证码{{ tab === 'login' ? '登录' : '注册' }}</h2>
          <span>使用手机号与短信验证码快速进入玩家中心。</span>
        </div>

        <el-tabs
          v-model="tab"
          class="auth-tabs"
        >
          <el-tab-pane
            label="短信登录"
            name="login"
          >
            <el-form
              class="auth-form"
              label-position="top"
              @submit.prevent="loginSubmit"
            >
              <el-form-item label="手机号">
                <el-input
                  v-model="loginForm.phone"
                  placeholder="请输入已注册的手机号"
                  :prefix-icon="Iphone"
                  maxlength="11"
                />
              </el-form-item>
              <el-form-item label="验证码">
                <div class="code-row">
                  <el-input
                    v-model="loginForm.code"
                    placeholder="请输入验证码"
                    maxlength="8"
                  />
                  <el-button
                    class="code-button"
                    :disabled="countdown > 0"
                    :loading="sending"
                    @click="sendCode"
                  >
                    {{ codeButtonText }}
                  </el-button>
                </div>
              </el-form-item>
              <el-button
                class="primary-action"
                type="primary"
                :loading="submitting"
                @click="loginSubmit"
              >
                登录
              </el-button>
            </el-form>
          </el-tab-pane>

          <el-tab-pane
            label="短信注册"
            name="register"
          >
            <el-form
              class="auth-form"
              label-position="top"
              @submit.prevent="registerSubmit"
            >
              <el-form-item label="手机号">
                <el-input
                  v-model="registerForm.phone"
                  placeholder="请输入未注册的手机号"
                  :prefix-icon="Iphone"
                  maxlength="11"
                />
              </el-form-item>
              <el-form-item label="验证码">
                <div class="code-row">
                  <el-input
                    v-model="registerForm.code"
                    placeholder="请输入验证码"
                    maxlength="8"
                  />
                  <el-button
                    class="code-button"
                    :disabled="countdown > 0"
                    :loading="sending"
                    @click="sendCode"
                  >
                    {{ codeButtonText }}
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item label="昵称（选填）">
                <el-input
                  v-model="registerForm.nickname"
                  placeholder="不填则按手机号自动生成"
                  :prefix-icon="User"
                  maxlength="64"
                />
              </el-form-item>
              <el-button
                class="primary-action"
                type="primary"
                :loading="submitting"
                @click="registerSubmit"
              >
                注册并登录
              </el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <p class="access-hint">
          注册即代表同意平台服务条款，新用户默认角色为普通会员。
        </p>
      </div>
    </div>
  </div>
</template>
