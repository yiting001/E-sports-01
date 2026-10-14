import { readonly, ref } from 'vue';
import { configApi } from '@/api/config.api';

/**
 * 门户开关状态（C 端 · 后台配置中心下发的显隐开关）。
 * 启动即拉取，失败保留默认值（默认全部开放），供登录页与个人页消费。
 */

const smsLoginEnabledRef = ref(true);
const loadedRef = ref(false);

let loadRevision = 0;

async function load(): Promise<void> {
  const revision = ++loadRevision;
  smsLoginEnabledRef.value = true;
  loadedRef.value = false;
  try {
    const data = await configApi.portal();
    if (revision !== loadRevision) {
      return;
    }
    smsLoginEnabledRef.value = data.smsLoginEnabled !== false;
  } catch {
    // 公开配置接口不可用时保留默认展示，不打扰用户
  } finally {
    if (revision === loadRevision) {
      loadedRef.value = true;
    }
  }
}

export const portal = {
  smsLoginEnabled: readonly(smsLoginEnabledRef),
  loaded: readonly(loadedRef),
  load,
};
