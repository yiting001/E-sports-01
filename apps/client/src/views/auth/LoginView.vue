<script setup lang="ts">
/**
 * 登录页（C 端 · 战术电竞风全屏页，登录注册合一）。
 * 登录方式由后台开关组合：手机号验证码（auth.smsLoginEnabled）与微信公众号一键登录
 * （auth.wechatOfficialLoginEnabled，仅微信内展示）可共存或二选一；
 * 两者均可用时以「一键登录 / 手机号登录」分段页签并列展示。
 * 手机号方式首次登录即自动注册普通会员，可选填好友邀请码（首登成功自动绑定邀请关系）。
 * 登录态由 auth.store 维护，成功后按 redirect 回跳或进入首页。校验反馈统一走全局 toast。
 * 登录前需勾选同意《用户协议》（后台富文本配置，弹层查看全文）。
 */
import { CHINA_MOBILE_PATTERN, INVITE_LIMITS } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/api/auth.api';
import { inviteApi } from '@/api/invite.api';
import AgreementDialog from '@/components/auth/AgreementDialog.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import { useToast } from '@/composables/use-toast';
import { useWechatOauth } from '@/composables/use-wechat-oauth';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import { usePortalStore } from '@/stores/portal.store';
import { resolveHttpErrorMessage } from '@/utils/http-error';
import { isWechatBrowser } from '@/utils/wechat-env';

/** 分段页签（微信与短信均可用时）：0=一键登录，1=手机号登录 */
const TABS = ['一键登录', '手机号登录'] as const;
/** 发送验证码后本地兜底冷却秒数（后端未返回 cooldown 时使用） */
const FALLBACK_COOLDOWN = 60;

const auth = useAuthStore();
const branding = useBrandingStore();
const portal = usePortalStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const wechatOauth = useWechatOauth();

const activeTab = ref(0);

/** 表单模型：inviteCode 为选填，仅首登自动注册时生效 */
const form = reactive({ phone: '', code: '', inviteCode: '' });

/** 是否已勾选同意用户协议（登录/注册提交前置条件） */
const agreed = ref(false);
/** 用户协议弹层显隐 */
const agreementOpen = ref(false);

const submitting = ref(false);
const sending = ref(false);
/** 微信一键登录进行中（跳转授权或回跳换登录态） */
const wechatLogging = ref(false);
/** 后台开启短信登录注册时展示手机号验证码表单 */
const smsLoginVisible = computed(() => portal.smsLoginEnabled);
/** 微信内且后台开启公众号登录时展示一键登录入口 */
const wechatLoginVisible = computed(
  () => isWechatBrowser() && portal.wechatOfficialLoginEnabled,
);
/** 仅开微信登录但当前不在微信内：提示去微信打开 */
const wechatOnlyOutside = computed(
  () => !portal.smsLoginEnabled && portal.wechatOfficialLoginEnabled && !isWechatBrowser(),
);
/** 两种登录方式均关闭：提示暂未开放 */
const noLoginAvailable = computed(
  () => portal.loaded && !portal.smsLoginEnabled && !portal.wechatOfficialLoginEnabled,
);
/** 两种登录方式均可用：展示「一键登录 / 手机号登录」页签 */
const tabsVisible = computed(() => smsLoginVisible.value && wechatLoginVisible.value);
/** 当前展示微信一键登录面板 */
const wechatPanelActive = computed(
  () => wechatLoginVisible.value && (!tabsVisible.value || activeTab.value === 0),
);
/** 当前展示手机号验证码面板 */
const smsPanelActive = computed(
  () => smsLoginVisible.value && (!tabsVisible.value || activeTab.value === 1),
);
/** 品牌区副标题：按已开启的登录方式描述 */
const subtitle = computed(() => {
  if (noLoginAvailable.value) return '登录暂未开放';
  return '登录后享受完整服务 · 首次登录即注册';
});
/** 验证码重发倒计时（秒），>0 时禁用发送按钮 */
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

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

/** 发送登录验证码（登录注册合一，未注册手机号也可发码） */
async function onSend(): Promise<void> {
  if (sending.value || countdown.value > 0 || !ensureValidPhone()) {
    return;
  }
  sending.value = true;
  try {
    const { cooldown } = await authApi.sendLoginCode({ phone: form.phone });
    startCountdown(cooldown > 0 ? cooldown : FALLBACK_COOLDOWN);
    toast.show('验证码已发送');
  } catch (error) {
    toast.show(resolveHttpErrorMessage(error, '验证码发送失败'));
  } finally {
    sending.value = false;
  }
}

/** 提交登录（登录注册合一）：首登自动注册并绑定邀请码，成功后回跳 */
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
    const { registered } = await auth.smsLogin({ phone: form.phone, code: form.code });
    if (registered) {
      await bindInviteCode();
    }
    toast.show(registered ? '注册成功' : '登录成功');
    redirectAfterLogin();
  } catch (error) {
    toast.show(resolveHttpErrorMessage(error, '登录失败'));
  } finally {
    submitting.value = false;
  }
}

/** 登录成功后按 redirect 回跳或进入首页 */
function redirectAfterLogin(): void {
  const redirect = route.query.redirect;
  void router.replace(typeof redirect === 'string' ? redirect : { name: 'home' });
}

/** 微信一键登录：跳转公众号网页授权（需先同意用户协议） */
async function onWechatLogin(): Promise<void> {
  if (wechatLogging.value) {
    return;
  }
  if (!agreed.value) {
    toast.show('请先阅读并同意《用户协议》');
    return;
  }
  wechatLogging.value = true;
  try {
    await wechatOauth.startAuthorize();
  } catch (error) {
    wechatLogging.value = false;
    toast.show(resolveHttpErrorMessage(error, '微信登录发起失败'));
  }
}

/** 处理微信授权回跳：用 code 换登录态，失败时保留页面可重试 */
async function consumeWechatOauthCode(): Promise<void> {
  const code = wechatOauth.readOauthCode();
  if (!code) {
    return;
  }
  wechatOauth.clearOauthCode();
  wechatLogging.value = true;
  try {
    await auth.wechatLogin({ code });
    toast.show('登录成功');
    redirectAfterLogin();
  } catch (error) {
    toast.show(resolveHttpErrorMessage(error, '微信登录失败，请重试'));
  } finally {
    wechatLogging.value = false;
  }
}

onMounted(() => {
  void consumeWechatOauthCode();
});

/** 首登自动注册后绑定好友邀请码：绑定失败不阻断登录流程，仅提示 */
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
      <span class="logo">
        <img
          v-if="branding.appLogo"
          :src="branding.appLogo"
          :alt="branding.appName"
          class="logo-img"
        >
        <template v-else>{{ branding.appName.slice(0, 1) }}</template>
      </span>
      <div class="brand-text">
        <h1 class="title">
          {{ branding.appName }}
        </h1>
        <p class="subtitle">
          {{ subtitle }}
        </p>
      </div>
    </div>

    <div class="panel card">
      <SegmentTabs
        v-if="tabsVisible"
        v-model="activeTab"
        :tabs="[...TABS]"
      />

      <form
        class="form"
        @submit.prevent="onSubmit"
      >
        <label
          v-if="smsPanelActive"
          class="field"
        >
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

        <label
          v-if="smsPanelActive"
          class="field"
        >
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
          v-if="smsPanelActive"
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
            placeholder="好友邀请码（选填，首次登录填码可得奖励）"
          >
        </label>

        <label
          v-if="smsPanelActive || wechatPanelActive"
          class="agree-row"
        >
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
          v-if="smsPanelActive"
          type="submit"
          class="submit"
          :disabled="submitting"
        >
          {{ submitting ? '处理中…' : '登录' }}
        </button>

        <button
          v-if="wechatPanelActive"
          type="button"
          class="wechat-login"
          :disabled="wechatLogging"
          @click="onWechatLogin"
        >
          {{ wechatLogging ? '微信登录中…' : '微信一键登录' }}
        </button>
      </form>

      <p
        v-if="smsPanelActive"
        class="hint"
      >
        未注册的手机号首次登录将自动注册为普通会员（member）
      </p>
      <p
        v-else-if="wechatPanelActive"
        class="hint"
      >
        首次微信登录将自动注册为普通会员（member）
      </p>
      <p
        v-else-if="wechatOnlyOutside"
        class="hint"
      >
        当前仅开放微信登录，请在微信内打开本页面使用微信一键登录
      </p>
      <p
        v-else-if="noLoginAvailable"
        class="hint"
      >
        登录注册暂未开放，请联系管理员
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

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.wechat-login {
  height: 48px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: #2aae67;
  border: none;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
}

.wechat-login:disabled {
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
