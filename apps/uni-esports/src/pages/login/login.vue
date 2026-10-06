<template>
  <view class="login">
    <view class="login-head">
      <text class="login-title">
        {{ branding.appName }}
      </text>
      <text class="login-sub">
        登录后下单、查看订单与联系客服
      </text>
    </view>

    <view class="card login-form">
      <view class="form-item">
        <text class="form-label">
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
      <view class="form-item">
        <text class="form-label">
          验证码
        </text>
        <view class="code-row">
          <input
            v-model="code"
            class="input code-input"
            type="number"
            maxlength="6"
            placeholder="短信验证码"
            placeholder-class="placeholder"
          >
          <button
            class="code-btn"
            :class="{ disabled: !canSendCode }"
            :disabled="!canSendCode"
            @tap="onSendCode"
          >
            {{ sendButtonText }}
          </button>
        </view>
      </view>

      <button
        class="btn-primary submit"
        :class="{ disabled: !canSubmit }"
        @tap="onSubmit"
      >
        登录 / 注册
      </button>

      <view
        class="agreement-row"
        @tap="agreed = !agreed"
      >
        <view
          class="checkbox"
          :class="{ checked: agreed }"
        >
          <text
            v-if="agreed"
            class="checkbox-mark"
          >
            ✓
          </text>
        </view>
        <text class="agreement-text">
          已阅读并同意
        </text>
        <text
          class="agreement-link"
          @tap.stop="openAgreement"
        >
          《平台协议与隐私政策》
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import { toast } from '@/utils/toast';

const branding = useBrandingStore();
const auth = useAuthStore();

const phone = ref('');
const code = ref('');
const agreed = ref(false);
const cooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const canSendCode = computed(
  () => cooldown.value === 0 && CHINA_MOBILE_PATTERN.test(phone.value),
);
const canSubmit = computed(
  () => agreed.value && CHINA_MOBILE_PATTERN.test(phone.value) && code.value.length >= 4,
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
  }
});

async function onSendCode(): Promise<void> {
  if (!canSendCode.value) {
    return;
  }
  const result = await authApi.sendLoginCode({ phone: phone.value });
  startCooldown(result.cooldown || 60);
  toast('验证码已发送');
}

function openAgreement(): void {
  uni.navigateTo({ url: '/pages/agreement/agreement' });
}

async function onSubmit(): Promise<void> {
  if (!agreed.value) {
    toast('请先阅读并同意平台协议与隐私政策');
    return;
  }
  if (!canSubmit.value) {
    return;
  }
  const registered = await auth.smsLogin({ phone: phone.value, code: code.value });
  toast(registered ? '注册成功' : '登录成功');
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: '/pages/home/home' });
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  padding: 120rpx 48rpx 0;
  box-sizing: border-box;
}

.login-head {
  margin-bottom: 56rpx;
}

.login-title {
  display: block;
  color: #e9eef6;
  font-size: 48rpx;
  font-weight: 700;
}

.login-sub {
  display: block;
  margin-top: 12rpx;
  color: #9aa6bb;
  font-size: 26rpx;
}

.login-form {
  padding: 40rpx 32rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  display: block;
  color: #9aa6bb;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.code-row {
  display: flex;
  gap: 16rpx;
}

.code-input {
  flex: 1;
}

.code-btn {
  width: 220rpx;
  color: #ffb020;
  font-size: 26rpx;
  border: 1rpx solid rgba(255, 176, 32, 0.5);
  border-radius: 8rpx;
  padding: 18rpx 0;
  background-color: rgba(255, 176, 32, 0.08);
}

.code-btn.disabled {
  color: #67738c;
  border-color: rgba(150, 165, 195, 0.3);
  background-color: transparent;
}

.submit {
  margin-top: 8rpx;
}

.agreement-row {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.4);
  border-radius: 6rpx;
  margin-right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background-color: #ffb020;
  border-color: #ffb020;
}

.checkbox-mark {
  color: #1a1205;
  font-size: 22rpx;
  font-weight: 700;
}

.agreement-text {
  color: #9aa6bb;
  font-size: 24rpx;
}

.agreement-link {
  color: #ffb020;
  font-size: 24rpx;
}

.placeholder {
  color: #67738c;
}
</style>
