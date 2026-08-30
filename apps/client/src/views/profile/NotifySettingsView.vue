<script setup lang="ts">
/**
 * 通知设置页（全屏，入口在「我的」页更多功能）。
 * 展示并管理微信通知绑定：公众号经网页授权回跳换 code 绑定；
 * 小程序绑定需在小程序内完成，此处只展示状态与解绑。
 * 平台未启用微信通知时仅展示提示，不提供绑定入口。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NotifyWechatChannel,
  type MyWechatBindingsView,
  type WechatBindingView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { notifyApi } from '@/api/notify.api';
import { useToast } from '@/composables/use-toast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const overview = ref<MyWechatBindingsView | null>(null);
const loading = ref(true);
const loadFailed = ref(false);
const acting = ref(false);

const officialBinding = computed<WechatBindingView | null>(
  () =>
    overview.value?.bindings.find(
      (binding) => binding.channel === NotifyWechatChannel.Official,
    ) ?? null,
);
const miniBinding = computed<WechatBindingView | null>(
  () =>
    overview.value?.bindings.find((binding) => binding.channel === NotifyWechatChannel.Mini) ??
    null,
);

async function load(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    overview.value = await notifyApi.myWechatBindings();
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

/** 公众号授权回跳会带 ?code=xxx；进入页面时先消费再清理地址栏 */
async function consumeAuthCode(): Promise<void> {
  const code = typeof route.query.code === 'string' ? route.query.code : '';
  if (!code) {
    return;
  }
  acting.value = true;
  try {
    await notifyApi.bindWechat(NotifyWechatChannel.Official, code);
    toast.show('公众号绑定成功');
  } catch {
    // http 层已统一弹错误提示
  } finally {
    acting.value = false;
    void router.replace({ name: 'notify-settings' });
  }
}

async function bindOfficial(): Promise<void> {
  if (acting.value) {
    return;
  }
  acting.value = true;
  try {
    const redirectUri = new URL(router.resolve(route.fullPath).href, window.location.href).toString();
    const { url } = await notifyApi.wechatAuthorizeUrl(redirectUri);
    window.location.href = url;
  } catch {
    acting.value = false;
  }
}

async function unbind(channel: NotifyWechatChannel): Promise<void> {
  if (acting.value) {
    return;
  }
  if (!window.confirm('确定解除该微信通知绑定吗？')) {
    return;
  }
  acting.value = true;
  try {
    await notifyApi.unbindWechat(channel);
    toast.show('已解除绑定');
    await load();
  } finally {
    acting.value = false;
  }
}

onMounted(async () => {
  await consumeAuthCode();
  await load();
});
</script>

<template>
  <div class="notify-page client-page">
    <header class="bar">
      <div class="bar-inner">
        <button
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">通知设置</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>

      <section
        v-else-if="loadFailed"
        class="card state"
      >
        <p class="state-tip">
          通知设置加载失败
        </p>
        <button
          class="retry"
          @click="load"
        >
          重试
        </button>
      </section>

      <template v-else-if="overview">
        <section
          v-if="!overview.enabled"
          class="card state"
        >
          <p class="state-tip">
            平台暂未开启微信通知，如需在微信内接收订单提醒请联系管理员配置
          </p>
        </section>

        <template v-else>
          <section class="card bind">
            <span class="bind-icon">
              <AppIcon
                name="bell"
                :size="20"
              />
            </span>
            <div class="bind-info">
              <strong>微信公众号通知</strong>
              <small v-if="officialBinding">已绑定（{{ officialBinding.openidMasked }}）</small>
              <small v-else>关注平台公众号并绑定后接收订单通知</small>
            </div>
            <button
              v-if="officialBinding"
              class="bind-btn ghost"
              :disabled="acting"
              @click="unbind(NotifyWechatChannel.Official)"
            >
              解绑
            </button>
            <button
              v-else
              class="bind-btn"
              :disabled="acting"
              @click="bindOfficial"
            >
              去绑定
            </button>
          </section>

          <section class="card bind">
            <span class="bind-icon">
              <AppIcon
                name="bell"
                :size="20"
              />
            </span>
            <div class="bind-info">
              <strong>微信小程序通知</strong>
              <small v-if="miniBinding">已绑定（{{ miniBinding.openidMasked }}）</small>
              <small v-else>请在平台小程序内完成绑定与消息订阅</small>
            </div>
            <button
              v-if="miniBinding"
              class="bind-btn ghost"
              :disabled="acting"
              @click="unbind(NotifyWechatChannel.Mini)"
            >
              解绑
            </button>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.hint {
  text-align: center;
  color: var(--c-text-muted);
  font-size: 13px;
  padding: 24px 0;
}

.state {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.state-tip {
  font-size: 13px;
  color: var(--c-text-secondary);
  text-align: center;
}

.retry {
  padding: 6px 20px;
  border: 1px solid var(--c-accent);
  color: var(--c-accent);
  font-size: 13px;
}

.bind {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
}

.bind-icon {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-accent-dim);
  color: var(--c-accent);
  flex-shrink: 0;
}

.bind-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.bind-info strong {
  font-size: 14px;
}

.bind-info small {
  font-size: 12px;
  color: var(--c-text-muted);
}

.bind-btn {
  flex-shrink: 0;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  background: var(--c-accent);
  color: #14120b;
}

.bind-btn.ghost {
  background: transparent;
  border: 1px solid var(--c-border);
  color: var(--c-text-muted);
}

.bind-btn:disabled {
  opacity: 0.6;
}
</style>
