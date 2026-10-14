<template>
  <view class="login">
    <!-- 品牌区：单一字体的电影感排版，界面其余部分退后 -->
    <view class="brand">
      <image
        v-if="appLogo"
        class="brand-mark"
        :src="appLogo"
        mode="aspectFill"
      />
      <view
        v-else
        class="brand-mark brand-mark--text"
      >
        <text class="brand-mark-initial">
          {{ appNameInitial }}
        </text>
      </view>
      <text class="type-display brand-name">
        {{ appName }}
      </text>
      <text class="type-small brand-sub">
        {{ subtitle }}
      </text>
    </view>

    <view
      v-if="smsLoginEnabled"
      class="form"
    >
      <view class="field">
        <text class="type-label field-label">
          手机号
        </text>
        <input
          v-model="phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="请输入 11 位手机号"
          placeholder-class="placeholder"
        >
      </view>

      <view class="field">
        <text class="type-label field-label">
          验证码
        </text>
        <view class="field-row">
          <input
            v-model="code"
            class="input code-input"
            type="number"
            maxlength="6"
            placeholder="短信验证码"
            placeholder-class="placeholder"
          >
          <text
            class="btn-text code-action"
            :class="{ 'is-disabled': !canSendCode }"
            @tap="onSendCode"
          >
            {{ sendButtonText }}
          </text>
        </view>
      </view>

      <view class="field">
        <text class="type-label field-label">
          邀请码（选填）
        </text>
        <input
          v-model="inviteCode"
          class="input"
          type="text"
          :maxlength="INVITE_CODE_LENGTH"
          placeholder="好友邀请码，首次登录填码可得奖励"
          placeholder-class="placeholder"
        >
      </view>

      <view
        class="agree"
        @tap="agreed = !agreed"
      >
        <view
          class="agree-box"
          :class="{ 'agree-box--checked': agreed }"
        >
          <text
            v-if="agreed"
            class="agree-tick"
          >
            ✓
          </text>
        </view>
        <text class="type-small agree-text">
          我已阅读并同意
        </text>
        <text
          class="type-small agree-link"
          @tap.stop="agreementOpen = true"
        >
          《用户协议与隐私政策》
        </text>
      </view>

      <view
        class="btn-primary submit"
        :class="{ 'is-disabled': !canSubmit || submitting }"
        @tap="onSubmit"
      >
        <text>{{ submitting ? '处理中…' : '登录 / 注册' }}</text>
      </view>

      <text class="type-small text-muted form-hint">
        未注册的手机号首次登录将自动注册为普通会员
      </text>
    </view>

    <agreement-sheet
      :open="agreementOpen"
      @close="agreementOpen = false"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { authApi } from '@/api/auth.api';
import { inviteApi } from '@/api/invite.api';
import agreementSheet from '@/components/agreement-sheet.vue';
import { auth } from '@/stores/auth';
import { branding } from '@/stores/branding';
import { portal } from '@/stores/portal';
import { CHINA_MOBILE_PATTERN, INVITE_CODE_LENGTH } from '@/types/auth';
import { toast } from '@/utils/toast';

/**
 * 登录页（登录注册合一）。
 * 登录方式由后台开关控制：本工程只接短信验证码（小程序微信登录需服务端 code2session 端点，暂未接入）。
 * 首登自动注册为普通会员（member 角色），可选填好友邀请码（绑定失败不阻断登录）；
 * 登录态由 stores/auth 维护，成功后回跳来源页或进入首页。
 */

/** 发送验证码后本地兜底冷却秒数（后端未返回 cooldown 时使用） */
const FALLBACK_COOLDOWN = 60;

const { appName, appLogo } = branding;
const { smsLoginEnabled } = portal;

const phone = ref('');
const code = ref('');
const inviteCode = ref('');
const agreed = ref(false);
const agreementOpen = ref(false);
const submitting = ref(false);
const cooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const appNameInitial = computed(() => appName.value.trim().slice(0, 1) || '电');

const subtitle = computed(() =>
  smsLoginEnabled.value ? '登录后下单、查看订单与联系客服' : '登录注册暂未开放，请联系管理员',
);

const canSendCode = computed(
  () => cooldown.value === 0 && CHINA_MOBILE_PATTERN.test(phone.value),
);

const canSubmit = computed(
  () => agreed.value && CHINA_MOBILE_PATTERN.test(phone.value) && code.value.trim().length >= 4,
);

const sendButtonText = computed(() =>
  cooldown.value > 0 ? `${cooldown.value}s 后重发` : '发送验证码',
);

function startCooldown(seconds: number): void {
  cooldown.value = seconds;
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
  }
  cooldownTimer = setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1);
    if (cooldown.value === 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
});

/** 发送登录验证码（登录注册合一，未注册手机号也可发码） */
async function onSendCode(): Promise<void> {
  if (!canSendCode.value) {
    if (cooldown.value === 0 && !CHINA_MOBILE_PATTERN.test(phone.value)) {
      toast('请输入正确的手机号');
    }
    return;
  }
  try {
    const result = await authApi.sendLoginCode({ phone: phone.value });
    startCooldown(result.cooldown > 0 ? result.cooldown : FALLBACK_COOLDOWN);
    toast('验证码已发送');
  } catch {
    // 接口错误已统一提示
  }
}

/** 提交登录：校验通过后写令牌；首登自动注册时再绑定邀请码 */
async function onSubmit(): Promise<void> {
  if (submitting.value) {
    return;
  }
  if (!CHINA_MOBILE_PATTERN.test(phone.value)) {
    toast('请输入正确的手机号');
    return;
  }
  if (code.value.trim().length < 4) {
    toast('请输入验证码');
    return;
  }
  if (!agreed.value) {
    toast('请先阅读并同意《用户协议与隐私政策》');
    return;
  }
  submitting.value = true;
  try {
    const { registered } = await auth.smsLogin({ phone: phone.value, code: code.value.trim() });
    if (registered) {
      await bindInviteCode();
    }
    toast(registered ? '注册成功' : '登录成功');
    backAfterLogin();
  } catch {
    // 接口错误已统一提示，保留表单供重试
  } finally {
    submitting.value = false;
  }
}

/** 登录成功后回跳来源页；无上一页（如从分享直接进入）则进首页 */
function backAfterLogin(): void {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/home/home' });
    },
  });
}

/** 首登自动注册后绑定好友邀请码：绑定失败不阻断登录流程，仅提示 */
async function bindInviteCode(): Promise<void> {
  const value = inviteCode.value.trim().toUpperCase();
  if (!value) {
    return;
  }
  try {
    await inviteApi.bind(value);
    toast('邀请码绑定成功');
  } catch {
    // 接口错误已统一提示
  }
}
</script>

<style scoped>
.login {
  padding: 96rpx 48rpx 64rpx;
  box-sizing: border-box;
}

/* ===== 品牌区 ===== */
.brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand-mark {
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
}

.brand-mark--text {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--c-text);
}

.brand-mark-initial {
  color: #000000;
  font-size: 56rpx;
  line-height: 1;
  letter-spacing: -1.2px;
}

.brand-name {
  margin-top: 40rpx;
  color: var(--c-text);
}

.brand-sub {
  margin-top: 16rpx;
  color: var(--c-text-secondary);
}

/* ===== 表单 ===== */
.form {
  margin-top: 72rpx;
}

.field {
  margin-bottom: 40rpx;
}

.field-label {
  display: block;
  margin-bottom: 16rpx;
}

.field-row {
  display: flex;
  align-items: center;
}

.code-input {
  flex: 1;
  min-width: 0;
}

.code-action {
  margin-left: 28rpx;
  flex-shrink: 0;
}

.code-action.is-disabled {
  color: var(--c-text-tertiary);
}

/* 协议勾选：方框直角，选中以白底黑勾表示（界面无色相） */
.agree {
  display: flex;
  align-items: center;
  margin: 8rpx 0 40rpx;
}

.agree-box {
  width: 32rpx;
  height: 32rpx;
  margin-right: 14rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-xs);
}

.agree-box--checked {
  background-color: var(--c-text);
  border-color: var(--c-text);
}

.agree-tick {
  color: #000000;
  font-size: 22rpx;
  line-height: 1;
}

.agree-text {
  color: var(--c-text-secondary);
}

.agree-link {
  color: var(--c-text);
}

.submit {
  margin-top: 8rpx;
}

.form-hint {
  display: block;
  margin-top: 32rpx;
  text-align: center;
}
</style>
