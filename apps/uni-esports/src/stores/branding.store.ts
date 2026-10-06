import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PortalConfigView } from '@app/contracts';
import { DEFAULT_APP_NAME } from '@app/contracts';
import { configApi } from '@/api/config.api';

/**
 * 平台品牌与门户开关（App 启动时加载一次）。
 * 加载失败静默回退默认值，不阻塞首屏。
 */
export const useBrandingStore = defineStore('branding', () => {
  const appName = ref(DEFAULT_APP_NAME);
  const appLogo = ref('');
  const portal = ref<PortalConfigView | null>(null);

  async function load(): Promise<void> {
    try {
      const [branding, portalView] = await Promise.all([
        configApi.branding(),
        configApi.portal(),
      ]);
      appName.value = branding.appName || DEFAULT_APP_NAME;
      appLogo.value = branding.appLogo;
      portal.value = portalView;
    } catch {
      // 未配置或网络异常时保持默认值
    }
  }

  return { appName, appLogo, portal, load };
});
