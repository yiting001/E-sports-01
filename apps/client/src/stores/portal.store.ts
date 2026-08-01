import { defineStore } from 'pinia';
import { ref } from 'vue';
import { configApi } from '@/api/config.api';

/**
 * C 端门户开关状态。
 * 单一职责：承载后台配置中心下发的门户显隐与调试开关，
 * 启动即拉取公开接口，供个人中心入口与对应页面统一消费。
 */
export const usePortalStore = defineStore('portal', () => {
  /** 是否展示排行榜入口与排行榜页（后台 portal.showRank 控制） */
  const showRank = ref(true);
  /** 是否加载 vConsole（后台 portal.vConsoleEnabled 控制，默认关闭） */
  const vConsoleEnabled = ref(false);
  /** 是否启用语音播报（后台 notify.voice.enabled 控制，默认开启） */
  const voiceNotifyEnabled = ref(true);
  /** 配置是否已加载完成（页面守卫需等加载后再判断显隐） */
  const loaded = ref(false);
  let loadRevision = 0;

  /** 拉取门户开关配置（失败时静默保留默认值，不阻塞应用） */
  async function load(): Promise<void> {
    const revision = ++loadRevision;
    showRank.value = true;
    vConsoleEnabled.value = false;
    voiceNotifyEnabled.value = true;
    loaded.value = false;
    try {
      const data = await configApi.portal();
      if (revision !== loadRevision) {
        return;
      }
      showRank.value = data.showRank;
      vConsoleEnabled.value = data.vConsoleEnabled === true;
      voiceNotifyEnabled.value = data.voiceNotifyEnabled !== false;
    } catch {
      // 公开配置接口不可用时保留默认展示，不打扰用户
    } finally {
      if (revision === loadRevision) {
        loaded.value = true;
      }
    }
  }

  return { showRank, vConsoleEnabled, voiceNotifyEnabled, loaded, load };
});
