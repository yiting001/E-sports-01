<template>
  <view class="levels">
    <!-- 未登录：等级与档位规则均需登录（接口带鉴权） -->
    <view
      v-if="!isLoggedIn"
      class="card guide"
    >
      <text class="type-title guide-title">
        登录后查看我的等级与折扣
      </text>
      <text class="type-small text-muted guide-text">
        按累计消费自动定级，等级越高下单折扣越优。
      </text>
      <view
        class="btn-primary guide-action"
        @tap="gotoLogin"
      >
        <text>去登录</text>
      </view>
    </view>

    <template v-else>
      <!-- 我的等级：数字为主角 -->
      <view class="card card-solid mine">
        <text class="type-label">我的等级</text>
        <view class="mine-main">
          <text class="type-num mine-level">
            {{ mineCard.level === null ? '--' : `Lv.${mineCard.level}` }}
          </text>
          <text class="type-title mine-name">
            {{ mineCard.levelName }}
          </text>
        </view>
        <view class="mine-foot">
          <text class="type-small text-muted">
            {{ mineCard.spendText }}
          </text>
          <text class="type-small text-muted">
            {{ mineCard.discountText }}
          </text>
        </view>
        <view
          v-if="mineCard.progressPercent !== null"
          class="progress"
        >
          <view
            class="progress-bar"
            :style="{ width: `${mineCard.progressPercent}%` }"
          />
        </view>
        <text
          v-if="mineCard.nextText"
          class="type-small text-faint progress-hint"
        >
          {{ mineCard.nextText }}
        </text>
      </view>

      <!-- 档位规则：当前档位以白色描边标出 -->
      <view class="section">
        <view class="section-head">
          <text class="type-label section-title">
            等级规则
          </text>
          <text class="type-label">累计消费自动升级</text>
        </view>

        <view
          v-for="tier in tiers"
          :key="tier.level"
          class="tier"
          :class="{ 'tier--current': tier.level === mineCard.level }"
        >
          <view class="tier-main">
            <text class="type-body tier-name">
              Lv.{{ tier.level }} {{ tier.name }}
            </text>
            <text class="type-small text-muted tier-need">
              累计消费满 ¥{{ tierNeed(tier.minSpendFen) }}
            </text>
          </view>
          <text class="type-num tier-discount">
            {{ discountText(tier.discountBp) }}
          </text>
        </view>

        <text
          v-if="loading"
          class="type-label list-foot"
        >
          加载中
        </text>
        <text
          v-else-if="tiers.length === 0"
          class="type-small text-faint list-foot"
        >
          暂未配置等级档位
        </text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { memberApi } from '@/api/member.api';
import { auth } from '@/stores/auth';
import { member } from '@/stores/member';
import type { MemberLevelTier } from '@/types/member';
import { discountLabel, fenToYuan } from '@/utils/format';
import { memberProgressPercent } from '@/utils/member';

/**
 * 会员等级：我的当前等级/折扣/累计消费 + 全部档位晋升规则。
 * 档位由管理端在配置中心维护，按累计消费自动定级；接口均带鉴权，未登录时展示登录引导。
 */

const { isLoggedIn, restore } = auth;
const { mine, refresh: refreshMember } = member;

const tiers = ref<MemberLevelTier[]>([]);
const loading = ref(true);
const initialized = ref(false);

const mineCard = computed(() => {
  const data = mine.value;
  if (!data) {
    return {
      level: null as number | null,
      levelName: '加载中',
      spendText: '累计消费 --',
      discountText: '--',
      progressPercent: null as number | null,
      nextText: '',
    };
  }
  return {
    level: data.level,
    levelName: data.levelName,
    spendText: `累计消费 ¥${data.spendYuan}`,
    discountText: discountLabel(data.discountBp),
    progressPercent: memberProgressPercent(data.spendFen, data.nextNeedFen),
    nextText: data.nextLevelName
      ? `再消费 ¥${fenToYuan(data.nextNeedFen)} 升级 ${data.nextLevelName}`
      : '已是最高等级',
  };
});

function discountText(discountBp: number): string {
  return discountLabel(discountBp);
}

function tierNeed(minSpendFen: number): string {
  return fenToYuan(minSpendFen);
}

onShow(async () => {
  await restore();
  if (!isLoggedIn.value) {
    initialized.value = false;
    return;
  }
  if (initialized.value) {
    return;
  }
  initialized.value = true;
  void refreshMember();
  void loadTiers();
});

async function loadTiers(): Promise<void> {
  loading.value = true;
  try {
    tiers.value = await memberApi.levels();
  } catch {
    tiers.value = [];
  } finally {
    loading.value = false;
  }
}

function gotoLogin(): void {
  uni.navigateTo({ url: '/pages/login/login' });
}
</script>

<style scoped>
.levels {
  padding: 40rpx 32rpx 64rpx;
  box-sizing: border-box;
}

/* ===== 未登录引导 ===== */
.guide-title {
  display: block;
  color: var(--c-text);
}

.guide-text {
  display: block;
  margin-top: 16rpx;
}

.guide-action {
  margin-top: 40rpx;
  width: 320rpx;
}

/* ===== 我的等级 ===== */
.mine-main {
  display: flex;
  align-items: baseline;
  margin-top: 20rpx;
}

.mine-level {
  color: var(--c-text);
  font-size: 72rpx;
  font-weight: 400;
  line-height: 1;
}

.mine-name {
  margin-left: 20rpx;
  color: var(--c-text);
}

.mine-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 28rpx;
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

/* ===== 档位规则 ===== */
.section {
  margin-top: 56rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid var(--c-border);
}

.section-title {
  color: var(--c-text);
}

.tier {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  margin-top: 16rpx;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-md);
}

/* 当前档位：以白色描边与提高对比表示（不加色相） */
.tier--current {
  border-color: var(--c-text);
}

.tier-main {
  flex: 1;
  min-width: 0;
}

.tier-name {
  display: block;
  color: var(--c-text);
}

.tier-need {
  display: block;
  margin-top: 8rpx;
}

.tier-discount {
  flex-shrink: 0;
  margin-left: 24rpx;
  color: var(--c-text);
  font-size: 30rpx;
  font-weight: 500;
}

.list-foot {
  display: block;
  padding: 40rpx 0 8rpx;
  text-align: center;
}
</style>
