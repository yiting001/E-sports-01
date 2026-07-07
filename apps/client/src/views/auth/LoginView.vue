<script setup lang="ts">
/**
 * 登录/注册页（C 端 · 战术电竞风全屏页）。
 * 仅支持手机号验证码方式：分段页签切换「登录 / 注册」，共用手机号+验证码表单，
 * 注册额外可填昵称与好友邀请码（填码注册成功自动绑定邀请关系）；注册成功即自动登录。登录态由 auth.store 维护，
 * 成功后按 redirect 回跳或进入首页。校验反馈统一走全局 toast。
 * 登录/注册均需勾选同意《用户协议》（后台富文本配置，弹层查看全文）。
 */
import { CHINA_MOBILE_PATTERN, INVITE_LIMITS } from '@app/contracts';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/api/auth.api';
import { inviteApi } from '@/api/invite.api';
import AgreementDialog from '@/components/auth/AgreementDialog.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import { useToast } from '@/composables/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import { resolveHttpErrorMessage } from '@/utils/http-error';

/** 分段页签：0=登录，1=注册 */
const TABS = ['登录', '注册'] as const;
/** 发送验证码后本地兜底冷却秒数（后端未返回 cooldown 时使用） */
const FALLBACK_COOLDOWN = 60;

const auth = useAuthStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const activeTab = ref(0);
const isRegister = computed(() => activeTab.value === 1);

/** 表单模型：登录/注册共用，nickname/inviteCode 仅注册用 */
const form = reactive({ phone: '', code: '', nickname: '', inviteCode: '' });

/** 是否已勾选同意用户协议（登录/注册提交前置条件） */
const agreed = ref(false);
/** 用户协议弹层显隐 */
const agreementOpen = ref(false);

const submitting = ref(false);
const sending = ref(false);
/** 验证码重发倒计时（秒），>0 时禁用发送按钮 */
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const submitText = computed(() => (isRegister.value ? '注册并登录' : '登录'));
const sendText = computed(() => (countdown.value > 0 ? `${countdown.value}s` : '发送验证码'));

/** 校验手机号格式，非法时提示并返回 false */
function ensureValidPhone(): boolean {
  if (!CHINA_MOBILE_PATTERN.test(form.phone)) {
    toast.show('请输入正确的手机号');
    return false;
  }
  return true;
}

/** 启动重发倒计时 */
function startCountdown(seconds: number): void {
  countdown.value = seconds;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

/** 发送验证码：按当前页签走登录/注册两条不同接口 */
async function onSend(): Promise<void> {
  if (sending.value || countdown.value > 0 || !ensureValidPhone()) {
    return;
  }
  sending.value = true;
  try {
    const send = isRegister.value ? authApi.sendRegisterCode : authApi.sendLoginCode;
    const { cooldown } = await send({ phone: form.phone });
    startCountdown(cooldown > 0 ? cooldown : FALLBACK_COOLDOWN);
    toast.show('验证码已发送');
  } catch (error) {
    toast.show(resolveHttpErrorMessage(error, '验证码发送失败'));
  } finally {
    sending.value = false;
  }
}

/** 提交：登录或注册，成功后回跳 */
async function onSubmit(): Promise<void> {
  if (submitting.value || !ensureValidPhone()) {
    return;
  }
  if (!form.code.trim()) {
    toast.show('请输入验证码');
    return;
  }
  if (!agreed.value) {
    toast.show('请先阅读并同意《用户协议》');
    return;
  }
  submitting.value = true;
  try {
    if (isRegister.value) {
      await auth.smsRegister({ phone: form.phone, code: form.code, nickname: form.nickname || undefined });
      await bindInviteCode();
    } else {
      await auth.smsLogin({ phone: form.phone, code: form.code });
    }
    toast.show(isRegister.value ? '注册成功' : '登录成功');
    const redirect = route.query.redirect;
    router.replace(typeof redirect === 'string' ? redirect : { name: 'home' });
  } catch (error) {
    toast.show(resolveHttpErrorMessage(error, isRegister.value ? '注册失败' : '登录失败'));
  } finally {
    submitting.value = false;
  }
}

/** 注册成功后绑定好友邀请码：绑定失败不阻断注册流程，仅提示 */
async function bindInviteCode(): Promise<void> {
  const code = form.inviteCode.trim().toUpperCase();
  if (!code) {
    return;
  }
  try {
    await inviteApi.bind(code);
    toast.show('邀请码绑定成功');
  } catch (error) {
    toast.show(resolveHttpErrorMessage(error, '邀请码绑定失败'));
  }
}
</script>

<template>
  <div class="login">
    <div class="brand">
      <span class="logo">E</span>
      <div class="brand-text">
        <h1 class="title">
          电竞陪练商城
        </h1>
        <p class="subtitle">
          手机号验证码 · 快捷登录注册
        </p>
      </div>
    </div>

    <div class="panel card">
      <SegmentTabs
        v-model="activeTab"
        :tabs="[...TABS]"
      />

      <form
        class="form"
        @submit.prevent="onSubmit"
      >
        <label class="field">
          <AppIcon
            name="phone"
            :size="18"
            class="field-icon"
          />
          <input
            v-model.trim="form.phone"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="请输入手机号"
            autocomplete="tel"
          >
        </label>

        <label class="field">
          <AppIcon
            name="shieldCheck"
            :size="18"
            class="field-icon"
          />
          <input
            v-model.trim="form.code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="请输入验证码"
            autocomplete="one-time-code"
          >
          <button
            type="button"
            class="send-btn"
            :disabled="sending || countdown > 0"
            @click="onSend"
          >
            {{ sendText }}
          </button>
        </label>

        <label
          v-if="isRegister"
          class="field"
        >
          <AppIcon
            name="user"
            :size="18"
            class="field-icon"
          />
          <input
            v-model.trim="form.nickname"
            type="text"
            maxlength="20"
            placeholder="昵称（选填，默认用手机号）"
          >
        </label>

        <label
          v-if="isRegister"
          class="field"
        >
          <AppIcon
            name="share"
            :size="18"
            class="field-icon"
          />
          <input
            v-model.trim="form.inviteCode"
            type="text"
            :maxlength="INVITE_LIMITS.codeLength"
            placeholder="好友邀请码（选填，填码可得奖励）"
          >
        </label>

        <label class="agree-row">
          <input
            v-model="agreed"
            type="checkbox"
            class="agree-check"
          >
          <span class="agree-text">我已阅读并同意
            <button
              type="button"
              class="agree-link"
              @click.prevent="agreementOpen = true"
            >《用户协议》</button>
          </span>
        </label>

        <button
          type="submit"
          class="submit"
          :disabled="submitting"
        >
          {{ submitting ? '处理中…' : submitText }}
        </button>
      </form>

      <p class="hint">
        {{ isRegister ? '注册即成为普通会员（member）' : '未注册的手机号请切换到「注册」页' }}
      </p>
    </div>

    <AgreementDialog v-model:open="agreementOpen" />
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 32px 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  background: var(--c-accent);
  color: var(--c-bg);
  font-size: 26px;
  font-weight: 800;
  font-style: italic;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
}

.title {
  font-size: 22px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 1px;
}

.subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--c-text-secondary);
}

.panel {
  width: 100%;
  max-width: 380px;
  padding: 22px 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  transition: border-color 0.2s ease;
}

.field:focus-within {
  border-color: var(--c-accent);
}

.field-icon {
  color: var(--c-accent);
  flex-shrink: 0;
}

.field input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--c-text);
}

.field input::placeholder {
  color: var(--c-text-muted);
}

.send-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-accent);
  border-left: 1px solid var(--c-border);
}

.send-btn:disabled {
  color: var(--c-text-muted);
  cursor: not-allowed;
}

.agree-row {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.agree-check {
  width: 16px;
  height: 16px;
  accent-color: var(--c-accent);
}

.agree-link {
  padding: 0;
  font-size: 12px;
  color: var(--c-accent);
  background: none;
  border: none;
}

.submit {
  margin-top: 4px;
  height: 48px;
  background: var(--c-accent);
  color: var(--c-bg);
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 2px;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  transition: opacity 0.2s ease;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  font-size: 12px;
  color: var(--c-text-muted);
  text-align: center;
  line-height: 1.6;
}
</style>
