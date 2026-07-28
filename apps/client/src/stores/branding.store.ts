import { DEFAULT_APP_NAME } from '@app/contracts';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { configApi } from '@/api/config.api';
import { tenantContext } from '@/tenant/tenant-context';

/**
 * 平台品牌状态（C 端 · 软件名称 + 图标）。
 * 名称/图标的单一来源是配置中心（与管理端共用 system.appName / system.appLogo），
 * 启动即拉取公开品牌接口，供浏览器标题、favicon、登录页与顶部导航统一消费。
 */
export const useBrandingStore = defineStore('branding', () => {
  const appName = ref(DEFAULT_APP_NAME);
  const appLogo = ref('');

  /** 当前路由页标题（如「我的」），与软件名称拼合成浏览器标题 */
  const pageTitle = ref('');
  let loadRevision = 0;

  /** 同步浏览器标题（「页标题 · 软件名称」）与 favicon */
  function applyDocument(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.title = pageTitle.value
      ? `${pageTitle.value} · ${appName.value}`
      : appName.value;
    const existingLink = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!appLogo.value) {
      existingLink?.remove();
      return;
    }
    let link = existingLink;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = appLogo.value;
  }

  /** 路由切换时更新页标题并重算浏览器标题 */
  function setPageTitle(title: string): void {
    pageTitle.value = title;
    applyDocument();
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

  return { appName, appLogo, load, setPageTitle };
});
