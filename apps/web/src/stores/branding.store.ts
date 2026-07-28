import { DEFAULT_APP_NAME } from '@app/contracts';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { configApi } from '@/api/config.api';
import { tenantContext } from '@/tenant/tenant-context';

/**
 * 平台品牌状态（软件名称 + 图标）。
 * 名称/图标的单一来源是配置中心，前端启动即拉取公开品牌接口，
 * 并据此设置浏览器标题与 favicon，供登录页、侧边栏等统一消费。
 */
export const useBrandingStore = defineStore('branding', () => {
  const appName = ref(DEFAULT_APP_NAME);
  const appLogo = ref('');
  let loadRevision = 0;

  /** 同步浏览器标题与 favicon 到当前品牌 */
  function applyDocument(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.title = appName.value;
    const rel = 'icon';
    const existingLink = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!appLogo.value) {
      existingLink?.remove();
      return;
    }
    let link = existingLink;
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = appLogo.value;
  }

  /** 拉取品牌信息（失败时静默保留默认值，不阻塞应用） */
  async function load(): Promise<void> {
    const revision = ++loadRevision;
    const tenantCode = tenantContext.getCode();
    const tenantRevision = tenantContext.revision.value;
    appName.value = DEFAULT_APP_NAME;
    appLogo.value = '';
    applyDocument();
    try {
      const data = await configApi.branding();
      if (revision !== loadRevision) {
        return;
      }
      appName.value = data.appName || DEFAULT_APP_NAME;
      appLogo.value = data.appLogo || '';
    } catch {
      // 公开品牌接口不可用时回退默认名，不打扰用户
    } finally {
      if (revision === loadRevision) {
        applyDocument();
        tenantContext.markReady(tenantCode, tenantRevision);
      }
    }
  }

  return { appName, appLogo, load, applyDocument };
});
