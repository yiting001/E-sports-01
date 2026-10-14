import { readonly, ref } from 'vue';
import { configApi } from '@/api/config.api';
import { DEFAULT_APP_NAME } from '@/types/config';

/**
 * 平台品牌状态（软件名称 + 图标）。
 * 名称/图标的单一来源是配置中心（与管理端共用 system.appName / system.appLogo）；
 * 启动即拉取，失败静默回退默认名，不阻塞首屏。
 * 说明：本工程暂未接入 Pinia（HBuilderX 原生工程无依赖），用模块级响应式状态承担同等职责。
 */

const appNameRef = ref(DEFAULT_APP_NAME);
const appLogoRef = ref('');

let loadRevision = 0;

async function load(): Promise<void> {
  const revision = ++loadRevision;
  try {
    const data = await configApi.branding();
    if (revision !== loadRevision) {
      return;
    }
    appNameRef.value = data.appName || DEFAULT_APP_NAME;
    appLogoRef.value = data.appLogo || '';
  } catch {
    // 公开品牌接口不可用时保留默认值
  }
}

export const branding = {
  appName: readonly(appNameRef),
  appLogo: readonly(appLogoRef),
  load,
};
