<template>
  <view class="profile">
    <view class="card head-card">
      <button
        v-if="auth.isLoggedIn"
        class="head-avatar-btn"
        open-type="chooseAvatar"
        @chooseavatar="onChooseAvatar"
      >
        <image
          v-if="auth.profile?.avatar"
          class="head-avatar"
          :src="auth.profile.avatar"
          mode="aspectFill"
        />
        <view
          v-else
          class="head-avatar head-avatar-fallback"
        >
          <text class="head-avatar-text">
            {{ avatarInitial }}
          </text>
        </view>
      </button>
      <view
        v-else
        class="head-avatar head-avatar-fallback"
        @tap="gotoLogin"
      >
        <text class="head-avatar-text">
          未
        </text>
      </view>
      <view class="head-body">
        <button
          v-if="auth.isLoggedIn"
          class="head-nickname-btn"
          @tap="editNickname"
        >
          <text class="head-nickname">
            {{ auth.displayName }}
          </text>
          <text class="head-nickname-edit">
            编辑
          </text>
        </button>
        <text
          v-else
          class="head-nickname"
          @tap="gotoLogin"
        >
          点击登录
        </text>
        <text class="head-phone">
          {{ auth.profile?.phone || '未绑定手机号' }}
        </text>
      </view>
    </view>

    <view class="card menu-card">
      <view
        class="menu-item"
        @tap="goto('/pages/order/list')"
      >
        <text class="menu-item-text">
          我的订单
        </text>
        <text class="menu-arrow">
          ›
        </text>
      </view>
      <view
        class="menu-item"
        @tap="goto('/pages/wallet/wallet')"
      >
        <text class="menu-item-text">
          我的钱包
        </text>
        <text class="menu-arrow">
          ›
        </text>
      </view>
      <view
        class="menu-item"
        @tap="gotoService"
      >
        <text class="menu-item-text">
          联系客服
        </text>
        <text class="menu-arrow">
          ›
        </text>
      </view>
      <view
        class="menu-item"
        @tap="goto('/pages/notice/list')"
      >
        <text class="menu-item-text">
          平台通知
        </text>
        <text class="menu-arrow">
          ›
        </text>
      </view>
    </view>

    <view class="card menu-card">
      <view
        class="menu-item"
        @tap="goto('/pages/agreement/agreement')"
      >
        <text class="menu-item-text">
          用户协议与隐私政策
        </text>
        <text class="menu-arrow">
          ›
        </text>
      </view>
    </view>

    <button
      v-if="auth.isLoggedIn"
      class="btn-ghost logout-btn"
      @tap="confirmLogout"
    >
      退出登录
    </button>
  </view>
</template>

<script setup lang="ts">
import { onShareAppMessage } from '@dcloudio/uni-app';
import { computed } from 'vue';
import { authApi } from '@/api/auth.api';
import { uploadApi } from '@/api/upload.api';
import { useRequireLogin } from '@/composables/use-require-login';
import { useBrandingStore } from '@/stores/branding.store';
import { toast } from '@/utils/toast';

const { auth, ensureLoggedIn, gotoLogin } = useRequireLogin(false);
const branding = useBrandingStore();

const avatarInitial = computed(() => auth.displayName.slice(0, 1) || '用');

onShareAppMessage(() => ({
  title: branding.appName,
  path: '/pages/home/home',
}));

function goto(url: string): void {
  if (!ensureLoggedIn()) {
    gotoLogin();
    return;
  }
  uni.navigateTo({ url });
}

function gotoService(): void {
  if (!ensureLoggedIn()) {
    gotoLogin();
    return;
  }
  uni.switchTab({ url: '/pages/message/message' });
}

/** 微信头像昵称填写能力：open-type=chooseAvatar 返回临时文件，经自助上传后换 URL */
async function onChooseAvatar(event: { detail: { avatarUrl: string } }): Promise<void> {
  const tempFilePath = event.detail?.avatarUrl;
  if (!tempFilePath) {
    return;
  }
  try {
    const uploaded = await uploadApi.uploadTempImage(tempFilePath);
    const updated = await authApi.updateProfile({ avatar: uploaded.url });
    if (auth.profile) {
      auth.profile = { ...auth.profile, avatar: updated.avatar };
    }
    toast('头像已更新');
  } catch {
    // 错误已统一提示
  }
}

async function editNickname(): Promise<void> {
  const nickname = await new Promise<string>((resolve) => {
    uni.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '输入新昵称',
      content: auth.profile?.nickname ?? '',
      confirmColor: '#ffb020',
      success: (result) => resolve(result.confirm ? result.content ?? '' : ''),
      fail: () => resolve(''),
    });
  });
  const trimmed = nickname.trim();
  if (!trimmed) {
    return;
  }
  try {
    const updated = await authApi.updateProfile({ nickname: trimmed });
    if (auth.profile) {
      auth.profile = { ...auth.profile, nickname: updated.nickname };
    }
    toast('昵称已更新');
  } catch {
    // 错误已统一提示
  }
}

function confirmLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号吗？',
    confirmColor: '#ffb020',
    success: (result) => {
      if (result.confirm) {
        auth.logout();
        toast('已退出登录');
      }
    },
  });
}
</script>

<style scoped>
.profile {
  padding: 24rpx;
}

.head-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
  padding: 40rpx 32rpx;
}

.head-avatar-btn {
  padding: 0;
  line-height: 1;
  background-color: transparent;
}

.head-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background-color: #071510;
}

.head-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 176, 32, 0.12);
  border: 1rpx solid rgba(255, 176, 32, 0.4);
}

.head-avatar-text {
  color: #ffb020;
  font-size: 48rpx;
  font-weight: 700;
}

.head-body {
  flex: 1;
  min-width: 0;
}

.head-nickname-btn {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0;
  text-align: left;
}

.head-nickname {
  color: #e9eef6;
  font-size: 36rpx;
  font-weight: 700;
}

.head-nickname-edit {
  color: #67738c;
  font-size: 22rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.3);
  border-radius: 6rpx;
  padding: 4rpx 12rpx;
}

.head-phone {
  display: block;
  margin-top: 8rpx;
  color: #9aa6bb;
  font-size: 24rpx;
}

.menu-card {
  margin-bottom: 24rpx;
  padding: 8rpx 24rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid rgba(150, 165, 195, 0.1);
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item-text {
  flex: 1;
  color: #e9eef6;
  font-size: 28rpx;
}

.menu-arrow {
  color: #67738c;
  font-size: 32rpx;
}

.logout-btn {
  margin-top: 8rpx;
}
</style>
