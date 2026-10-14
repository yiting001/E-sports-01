<template>
  <view class="profile">
    <!-- 头部：头像 + 昵称 + 账号信息；未登录时以「立即登录」进入登录页 -->
    <view
      class="head"
      :style="{ marginTop: `${topInset}px` }"
    >
      <view
        class="head-avatar"
        @tap="onAvatarTap"
      >
        <image
          v-if="avatarUrl"
          class="head-avatar-image"
          :src="avatarUrl"
          mode="aspectFill"
        />
        <text
          v-else
          class="head-avatar-initial"
        >
          {{ avatarInitial }}
        </text>
      </view>
      <view class="head-body">
        <view
          v-if="isLoggedIn"
          class="head-name-row"
        >
          <text class="type-headline head-name">
            {{ displayName }}
          </text>
          <text
            class="btn-text head-edit"
            @tap="startEditNickname"
          >
            编辑
          </text>
        </view>
        <view
          v-else
          class="head-name-row"
        >
          <text
            class="type-headline head-name head-name--guest"
            @tap="gotoLogin"
          >
            立即登录
          </text>
        </view>
        <text class="type-label head-meta">
          {{ isLoggedIn ? `用户ID ${profile?.id ?? ''}` : '登录后查看订单与余额' }}
        </text>
      </view>
    </view>

    <!-- 编辑昵称：内联表单，跨端一致（不依赖各端 showModal 的输入能力） -->
    <view
      v-if="editingNickname"
      class="nickname-edit card"
    >
      <text class="type-label nickname-edit-label">
        昵称
      </text>
      <input
        v-model="nicknameDraft"
        class="input nickname-edit-input"
        type="text"
        maxlength="24"
        placeholder="请输入昵称"
        placeholder-class="placeholder"
      >
      <view class="nickname-edit-actions">
        <text
          class="btn-text"
          @tap="editingNickname = false"
        >
          取消
        </text>
        <text
          class="btn-text nickname-edit-save"
          @tap="saveNickname"
        >
          {{ savingNickname ? '保存中…' : '保存' }}
        </text>
      </view>
    </view>

    <!-- 会员等级：等级 + 折扣 + 晋升进度（数据来自 /member/mine） -->
    <view
      class="card card-solid metric"
      @tap="onMemberTap"
    >
      <text class="type-label metric-label">
        会员等级
      </text>
      <view class="metric-main">
        <text class="type-num metric-value">
          {{ memberCard.level === null ? '--' : `Lv.${memberCard.level}` }}
        </text>
        <text class="type-small text-muted metric-suffix">
          {{ memberCard.levelName }}
        </text>
      </view>
      <view class="metric-foot">
        <text class="type-small text-muted">
          {{ memberCard.spendText }}
        </text>
        <text class="type-small text-muted">
          {{ memberCard.discountText }}
        </text>
      </view>
      <view
        v-if="memberCard.progressPercent !== null"
        class="progress"
      >
        <view
          class="progress-bar"
          :style="{ width: `${memberCard.progressPercent}%` }"
        />
      </view>
      <text
        v-if="memberCard.nextText"
        class="type-small text-faint progress-hint"
      >
        {{ memberCard.nextText }}
      </text>
    </view>

    <!-- 余额：单一大数字，界面其余部分退后 -->
    <view
      class="card card-solid metric"
      @tap="onWalletTap"
    >
      <text class="type-label metric-label">
        账户余额
      </text>
      <view class="metric-main">
        <text class="type-num metric-value">
          {{ balanceText }}
        </text>
      </view>
      <text class="type-small text-muted">
        {{ isLoggedIn ? '充值 / 提现随支付渠道开通后开放' : '登录后查看余额' }}
      </text>
    </view>

    <!-- 功能入口：纯文字行 + 细线分隔（界面不做装饰性图标） -->
    <view class="entries">
      <view
        class="entry"
        @tap="openEntry('orders')"
      >
        <text class="type-body entry-label">
          我的订单
        </text>
        <text class="entry-arrow">
          ›
        </text>
      </view>
      <view
        class="entry"
        @tap="openEntry('wallet')"
      >
        <text class="type-body entry-label">
          我的钱包
        </text>
        <text class="entry-arrow">
          ›
        </text>
      </view>
      <view
        class="entry"
        @tap="agreementOpen = true"
      >
        <text class="type-body entry-label">
          用户协议与隐私政策
        </text>
        <text class="entry-arrow">
          ›
        </text>
      </view>
      <view
        class="entry"
        @tap="openEntry('service')"
      >
        <text class="type-body entry-label">
          联系客服
        </text>
        <text class="entry-arrow">
          ›
        </text>
      </view>
    </view>

    <view
      v-if="isLoggedIn"
      class="btn-ghost logout"
      @tap="confirmLogout"
    >
      <text>退出登录</text>
    </view>

    <text class="type-label version">
      {{ appName }} · 版本 {{ APP_VERSION }}
    </text>

    <agreement-sheet
      :open="agreementOpen"
      @close="agreementOpen = false"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { uploadApi } from '@/api/upload.api';
import agreementSheet from '@/components/agreement-sheet.vue';
import { auth } from '@/stores/auth';
import { branding } from '@/stores/branding';
import { im } from '@/stores/im';
import { member } from '@/stores/member';
import { wallet } from '@/stores/wallet';
import { discountLabel, fenToYuan, priceLabel } from '@/utils/format';
import { getCustomNavTopInsetPx } from '@/utils/system';
import { memberProgressPercent } from '@/utils/member';
import { resolveMediaUrl } from '@/utils/media-url';
import { toast } from '@/utils/toast';

/**
 * 我的页：登录态头部 → 会员等级 → 余额 → 功能入口 → 退出登录。
 * 资料/等级/余额分别取自 stores（auth/member/wallet），页面只做编排与交互；
 * 未登录时展示登录引导，已登录时 onShow 刷新等级与余额。
 */

/** 版本号（与 manifest.json 的 versionName 保持一致，发布时同步修改） */
const APP_VERSION = '1.0.0';

const { appName } = branding;
const { profile, isLoggedIn, displayName, logout, updateProfile, restore } = auth;
const { mine: memberMine, refresh: refreshMember } = member;
const { mine: walletMine, refresh: refreshWallet } = wallet;

/** 自定义导航下的顶部安全区（状态栏 + 胶囊按钮高度） */
const topInset = ref(getCustomNavTopInsetPx());

const agreementOpen = ref(false);
const editingNickname = ref(false);
const nicknameDraft = ref('');
const savingNickname = ref(false);

const avatarUrl = computed(() => resolveMediaUrl(profile.value?.avatar ?? ''));

const avatarInitial = computed(() => displayName.value.trim().slice(0, 1) || '未');

/** 会员卡数据：登录后由 /member/mine 填充，未登录或加载失败展示占位 */
const memberCard = computed(() => {
  const mine = memberMine.value;
  if (!mine) {
    return {
      level: null as number | null,
      levelName: isLoggedIn.value ? '加载中' : '登录后查看',
      spendText: '累计消费 --',
      discountText: '--',
      progressPercent: null as number | null,
      nextText: '',
    };
  }
  return {
    level: mine.level,
    levelName: mine.levelName,
    spendText: `累计消费 ¥${mine.spendYuan}`,
    discountText: discountLabel(mine.discountBp),
    progressPercent: memberProgressPercent(mine.spendFen, mine.nextNeedFen),
    nextText: mine.nextLevelName
      ? `距 ${mine.nextLevelName} 还差 ${priceLabel(mine.nextNeedFen)}`
      : '已是最高等级',
  };
});

const balanceText = computed(() => {
  const mine = walletMine.value;
  if (!mine) {
    return '--';
  }
  return `¥${mine.balanceYuan || fenToYuan(mine.balanceFen)}`;
});

onShareAppMessage(() => ({
  title: appName.value,
  path: '/pages/home/home',
}));

onShow(async () => {
  await restore();
  if (isLoggedIn.value) {
    void refreshMember();
    void refreshWallet();
  }
});

function gotoLogin(): void {
  uni.navigateTo({ url: '/pages/login/login' });
}

/** 已登录时点头像即换头像（相册/相机 → 自助上传 → 更新资料） */
async function onAvatarTap(): Promise<void> {
  if (!isLoggedIn.value) {
    gotoLogin();
    return;
  }
  try {
    const uploaded = await uploadApi.chooseAndUploadImage();
    await updateProfile({ avatar: uploaded.url });
    toast('头像已更新');
  } catch {
    // 取消选择或接口错误均已提示
  }
}

function startEditNickname(): void {
  nicknameDraft.value = profile.value?.nickname ?? '';
  editingNickname.value = true;
}

async function saveNickname(): Promise<void> {
  const nickname = nicknameDraft.value.trim();
  if (!nickname) {
    toast('请输入昵称');
    return;
  }
  if (savingNickname.value) {
    return;
  }
  savingNickname.value = true;
  try {
    await updateProfile({ nickname });
    editingNickname.value = false;
    toast('昵称已更新');
  } catch {
    // 接口错误已统一提示
  } finally {
    savingNickname.value = false;
  }
}

/** 会员等级卡：进入会员等级页（未登录先去登录） */
function onMemberTap(): void {
  if (!isLoggedIn.value) {
    gotoLogin();
    return;
  }
  uni.navigateTo({ url: '/pages/member/levels' });
}

/** 余额卡：进入钱包页（未登录先去登录） */
function onWalletTap(): void {
  if (!isLoggedIn.value) {
    gotoLogin();
    return;
  }
  uni.navigateTo({ url: '/pages/wallet/wallet' });
}

function openEntry(entry: 'orders' | 'wallet' | 'service'): void {
  if (!isLoggedIn.value) {
    gotoLogin();
    return;
  }
  if (entry === 'orders') {
    uni.navigateTo({ url: '/pages/order/list' });
    return;
  }
  if (entry === 'wallet') {
    uni.navigateTo({ url: '/pages/wallet/wallet' });
    return;
  }
  void onContactService();
}

/** 联系客服：发起客服会话后进入聊天页（与消息页入口一致） */
async function onContactService(): Promise<void> {
  try {
    const conversation = await im.startServiceChat('咨询');
    uni.navigateTo({
      url: `/pages/chat/chat?conversationId=${conversation.id}&kind=${conversation.type}`,
    });
  } catch {
    toast('客服会话创建失败，请稍后重试');
  }
}

/** 退出登录二次确认，避免误触 */
function confirmLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '退出后需重新验证手机号登录，确定退出？',
    confirmText: '退出登录',
    cancelText: '取消',
    success: (result) => {
      if (!result.confirm) {
        return;
      }
      logout();
      toast('已退出登录');
    },
  });
}
</script>

<style scoped>
.profile {
  padding: 0 32rpx 64rpx;
  box-sizing: border-box;
}

/* ===== 头部 ===== */
.head {
  display: flex;
  align-items: center;
}

.head-avatar {
  width: 128rpx;
  height: 128rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
  overflow: hidden;
}

.head-avatar-image {
  width: 128rpx;
  height: 128rpx;
  display: block;
}

.head-avatar-initial {
  color: var(--c-silver);
  font-size: 52rpx;
  line-height: 1;
  letter-spacing: -1.2px;
}

.head-body {
  flex: 1;
  min-width: 0;
  margin-left: 28rpx;
}

.head-name-row {
  display: flex;
  align-items: baseline;
}

.head-name {
  max-width: 100%;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-name--guest {
  color: var(--c-text);
}

.head-edit {
  margin-left: 20rpx;
  flex-shrink: 0;
  color: var(--c-text-secondary);
}

.head-meta {
  display: block;
  margin-top: 12rpx;
}

/* ===== 昵称编辑 ===== */
.nickname-edit {
  margin-top: 32rpx;
}

.nickname-edit-label {
  display: block;
  margin-bottom: 16rpx;
}

.nickname-edit-input {
  width: 100%;
}

.nickname-edit-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24rpx;
}

.nickname-edit-save {
  margin-left: 40rpx;
}

/* ===== 数据卡：会员 / 余额 ===== */
.metric {
  margin-top: 32rpx;
}

.metric-label {
  display: block;
}

.metric-main {
  display: flex;
  align-items: baseline;
  margin-top: 20rpx;
}

.metric-value {
  color: var(--c-text);
  font-size: 64rpx;
  font-weight: 400;
  line-height: 1;
}

.metric-suffix {
  margin-left: 16rpx;
}

.metric-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
}

.progress {
  margin-top: 24rpx;
  height: 2rpx;
  background-color: var(--c-border);
}

.progress-bar {
  height: 2rpx;
  background-color: var(--c-text);
}

.progress-hint {
  display: block;
  margin-top: 16rpx;
}

/* ===== 功能入口 ===== */
.entries {
  margin-top: 48rpx;
  border-top: 1rpx solid var(--c-border);
}

.entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 108rpx;
  border-bottom: 1rpx solid var(--c-border);
}

.entry-label {
  color: var(--c-text);
}

.entry-arrow {
  color: var(--c-text-tertiary);
  font-size: 32rpx;
}

.logout {
  margin-top: 64rpx;
}

.version {
  display: block;
  margin-top: 40rpx;
  text-align: center;
}
</style>
